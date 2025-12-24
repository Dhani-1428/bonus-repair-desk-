import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute, escapeId } from "@/lib/mysql"
import { getTenantTableNames, tenantTablesExist, createTenantTables } from "@/lib/tenant-db"

// GET single repair ticket by ID (tenant-specific)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

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

    const tables = getTenantTableNames(user.tenantId)
    const tableName = escapeId(tables.repairTickets)
    const ticket = await queryOne(
      `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
      [params.id]
    )

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      )
    }

    // Parse JSON fields
    if (ticket.selectedServices && typeof ticket.selectedServices === 'string') {
      try {
        ticket.selectedServices = JSON.parse(ticket.selectedServices)
      } catch (e) {
        console.error("[API] Error parsing selectedServices:", e)
        ticket.selectedServices = []
      }
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("[API] Error fetching repair ticket:", error)
    return NextResponse.json(
      { error: "Failed to fetch repair ticket" },
      { status: 500 }
    )
  }
}

// PUT update repair ticket (tenant-specific)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId, ...updateData } = body

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

    updateValues.push(params.id)

    await execute(
      `UPDATE ${tableName} SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    )

    // Fetch updated ticket
    const ticket = await queryOne(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [params.id]
    )

    // Parse JSON fields
    if (ticket && ticket.selectedServices && typeof ticket.selectedServices === 'string') {
      try {
        ticket.selectedServices = JSON.parse(ticket.selectedServices)
      } catch (e) {
        console.error("[API] Error parsing selectedServices:", e)
        ticket.selectedServices = []
      }
    }

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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

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

    const tables = getTenantTableNames(user.tenantId)
    const repairTable = escapeId(tables.repairTickets)
    const deletedTable = escapeId(tables.deletedTickets)

    // Move to deleted tickets before deleting
    const ticket = await queryOne(
      `SELECT * FROM ${repairTable} WHERE id = ?`,
      [params.id]
    )

    if (ticket) {
      await execute(
        `INSERT INTO ${deletedTable} (id, userId, repairNumber, clientId, customerName, contact, imeiNo,
          brand, model, serialNo, softwareVersion, warranty, battery, charger,
          simCard, memoryCard, loanEquipment, equipmentObs, repairObs,
          selectedServices, \`condition\`, problem, price, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket.id,
          ticket.userId,
          ticket.repairNumber,
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
      [params.id]
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
