import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute, escapeId } from "@/lib/mysql"
import { getTenantTableNames, createTenantTables, tenantTablesExist, migrateTenantTables } from "@/lib/tenant-db"
import { getUserTenantId, canAccessTenantData } from "@/lib/tenant-security"

// GET all repair tickets for a user (tenant-specific)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const tenantId = searchParams.get("tenantId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get user to find tenantId
    const user = await queryOne(
      `SELECT tenantId FROM users WHERE id = ?`,
      [userId]
    )

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userTenantId = tenantId || user.tenantId

    // Security check: Verify user can only access their own tenant data (unless super admin)
    // If a different tenantId is provided in query params, verify access
    if (tenantId && tenantId !== user.tenantId) {
      const hasAccess = await canAccessTenantData(userId, tenantId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied: You can only access your own tenant data" },
          { status: 403 }
        )
      }
    }
    // If no tenantId provided, user can only access their own data (already verified by user.tenantId)

    // Ensure tenant tables exist
    if (!(await tenantTablesExist(userTenantId))) {
      console.log(`[API] Creating tenant tables for tenantId: ${userTenantId}`)
      await createTenantTables(userTenantId)
      console.log(`[API] ✅ Tenant tables created for tenantId: ${userTenantId}`)
    }

    const tables = getTenantTableNames(userTenantId)
    const tableName = escapeId(tables.repairTickets)
    
    console.log(`[API] Fetching repair tickets from table: ${tableName} for userId: ${userId}, tenantId: ${userTenantId}`)
    console.log(`[API] Database: ${process.env.DB_NAME || "admin_panel_db"}`)
    
    let tickets
    try {
      tickets = await query(
        `SELECT * FROM ${tableName} WHERE userId = ? ORDER BY createdAt DESC`,
        [userId]
      )
      console.log(`[API] ✅ Found ${tickets.length} repair ticket(s) for user ${userId}`)
    } catch (queryError: any) {
      console.error(`[API] ❌ Error querying table ${tableName}:`, queryError?.message || queryError)
      console.error(`[API] Error details:`, {
        code: queryError?.code,
        errno: queryError?.errno,
        sqlState: queryError?.sqlState,
        sqlMessage: queryError?.sqlMessage,
      })
      
      // If table doesn't exist, return empty array instead of error
      if (queryError?.code === "ER_NO_SUCH_TABLE" || queryError?.message?.includes("doesn't exist")) {
        console.warn(`[API] ⚠️  Table ${tableName} does not exist. Returning empty array.`)
        tickets = []
      } else {
        throw queryError
      }
    }

    // Parse JSON fields for all tickets
    const parsedTickets = tickets.map((ticket: any) => {
      if (ticket.selectedServices && typeof ticket.selectedServices === 'string') {
        try {
          ticket.selectedServices = JSON.parse(ticket.selectedServices)
        } catch (e) {
          console.error("[API] Error parsing selectedServices:", e)
          ticket.selectedServices = []
        }
      }
      return ticket
    })

    return NextResponse.json({ tickets: parsedTickets })
  } catch (error) {
    console.error("[API] Error fetching repair tickets:", error)
    return NextResponse.json(
      { error: "Failed to fetch repair tickets" },
      { status: 500 }
    )
  }
}

// POST create new repair ticket (tenant-specific)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      repairNumber,
      spu,
      clientId,
      customerName,
      contact,
      imeiNo,
      brand,
      model,
      serialNo,
      softwareVersion,
      warranty,
      battery,
      charger,
      simCard,
      memoryCard,
      loanEquipment,
      equipmentObs,
      repairObs,
      selectedServices,
      condition,
      problem,
      price,
      status,
    } = body

    if (!userId || !repairNumber || !spu || !customerName || !contact || !imeiNo || !brand || !model || !problem || price === undefined || !clientId || clientId.trim() === "") {
      return NextResponse.json(
        { error: "Missing required fields. Client NIF is required." },
        { status: 400 }
      )
    }

    // Get user to find tenantId
    const user = await queryOne(
      `SELECT tenantId FROM users WHERE id = ?`,
      [userId]
    )

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Ensure tenant tables exist
    if (!(await tenantTablesExist(user.tenantId))) {
      await createTenantTables(user.tenantId)
    } else {
      // Migrate existing tables to add any missing columns
      await migrateTenantTables(user.tenantId)
    }

    const tables = getTenantTableNames(user.tenantId)
    const tableName = escapeId(tables.repairTickets)
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Insert ticket into tenant-specific table
    await execute(
      `INSERT INTO ${tableName} (id, userId, repairNumber, spu, clientId, customerName, contact, imeiNo,
        brand, model, serialNo, softwareVersion, warranty, battery, charger,
        simCard, memoryCard, loanEquipment, equipmentObs, repairObs,
        selectedServices, \`condition\`, problem, price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketId,
        userId,
        repairNumber,
        spu,
        clientId.trim(),
        customerName,
        contact,
        imeiNo,
        brand,
        model,
        serialNo || null,
        softwareVersion || null,
        warranty || "Without Warranty",
        battery || false,
        charger || false,
        simCard || false,
        memoryCard || false,
        loanEquipment || false,
        equipmentObs || null,
        repairObs || null,
        JSON.stringify(selectedServices || []),
        condition || null,
        problem,
        parseFloat(price),
        status || "PENDING"
      ]
    )

    // Fetch created ticket
    const ticket = await queryOne(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [ticketId]
    )

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Error creating repair ticket:", error)
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Repair number, SPU, or IMEI already exists" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create repair ticket" },
      { status: 500 }
    )
  }
}

// PUT update repair ticket (tenant-specific)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, userId, ...updateData } = body

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Ticket ID and User ID are required" },
        { status: 400 }
      )
    }

    // Get user to find tenantId
    const user = await queryOne(
      `SELECT tenantId FROM users WHERE id = ?`,
      [userId]
    )

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const tables = getTenantTableNames(user.tenantId)
    const tableName = escapeId(tables.repairTickets)

    // Build update query dynamically
    const updateFields: string[] = []
    const updateValues: any[] = []

    Object.entries(updateData).forEach(([key, value]) => {
      if (key === "selectedServices" && Array.isArray(value)) {
        updateFields.push(`\`${key}\` = ?`)
        updateValues.push(JSON.stringify(value))
      } else {
        updateFields.push(`\`${key}\` = ?`)
        updateValues.push(value)
      }
    })

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    updateValues.push(id)

    await execute(
      `UPDATE ${tableName} SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    )

    // Fetch updated ticket
    const ticket = await queryOne(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    )

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("[API] Error updating repair ticket:", error)
    return NextResponse.json(
      { error: "Failed to update repair ticket" },
      { status: 500 }
    )
  }
}

// DELETE repair ticket (tenant-specific)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const userId = searchParams.get("userId")

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Ticket ID and User ID are required" },
        { status: 400 }
      )
    }

    // Get user to find tenantId
    const user = await queryOne(
      `SELECT tenantId FROM users WHERE id = ?`,
      [userId]
    )

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const tables = getTenantTableNames(user.tenantId)
    const repairTable = escapeId(tables.repairTickets)
    const deletedTable = escapeId(tables.deletedTickets)

    // Move to deleted tickets before deleting
    const ticket = await queryOne(
      `SELECT * FROM ${repairTable} WHERE id = ?`,
      [id]
    )

    if (ticket) {
      await execute(
        `INSERT INTO ${deletedTable} (id, userId, repairNumber, spu, clientId, customerName, contact, imeiNo,
          brand, model, serialNo, softwareVersion, warranty, battery, charger,
          simCard, memoryCard, loanEquipment, equipmentObs, repairObs,
          selectedServices, \`condition\`, problem, price, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket.id,
          ticket.userId,
          ticket.repairNumber,
          ticket.spu,
          ticket.clientId,
          ticket.customerName,
          ticket.contact,
          ticket.imeiNo,
          ticket.brand,
          ticket.model,
          ticket.serialNo,
          ticket.softwareVersion,
          ticket.warranty,
          ticket.battery,
          ticket.charger,
          ticket.simCard,
          ticket.memoryCard,
          ticket.loanEquipment,
          ticket.equipmentObs,
          ticket.repairObs,
          ticket.selectedServices,
          ticket.condition,
          ticket.problem,
          ticket.price,
          ticket.status
        ]
      )
    }

    await execute(
      `DELETE FROM ${repairTable} WHERE id = ?`,
      [id]
    )

    return NextResponse.json({ message: "Ticket deleted successfully" })
  } catch (error) {
    console.error("[API] Error deleting repair ticket:", error)
    return NextResponse.json(
      { error: "Failed to delete repair ticket" },
      { status: 500 }
    )
  }
}
