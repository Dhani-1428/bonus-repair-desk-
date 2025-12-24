import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute, escapeId, getConnection } from "@/lib/mysql"
import { getTenantTableNames, createTenantTables, tenantTablesExist, migrateTenantTables } from "@/lib/tenant-db"
import mysql from "mysql2/promise"

// Generate unique Repair Number for tenant (format: YYYY-XXXX)
// Simple sequential generation - duplicates handled by retry in main function
async function generateRepairNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${year}-`

  const tables = getTenantTableNames(tenantId)
  const tableName = escapeId(tables.repairTickets)

  try {
    // Get max sequence number
    const allRepairs = await query(
      `SELECT repairNumber FROM ${tableName} 
       WHERE repairNumber LIKE ? OR repairNumber LIKE ?
       ORDER BY repairNumber DESC
       LIMIT 1`,
      [`${prefix}%`, `REP-${prefix}%`]
    ) as any[]

    let maxSequence = 0
    if (allRepairs && Array.isArray(allRepairs) && allRepairs.length > 0) {
      const repair = allRepairs[0]
      if (repair && repair.repairNumber) {
        const match = repair.repairNumber.match(/-(\d{4})$/);
        if (match) {
          const seq = parseInt(match[1], 10)
          if (!isNaN(seq)) {
            maxSequence = seq
          }
        }
      }
    }

    // Generate next sequential number
    let sequence = maxSequence + 1
    
    // If we exceed 9999, wrap around to 1
    if (sequence > 9999) {
      sequence = 1
    }

    return `${prefix}${sequence.toString().padStart(4, "0")}`
  } catch (error: any) {
    console.error("[generateRepairNumber] Error:", error)
    // Fallback: use timestamp-based generation
    const timestamp = Date.now()
    const fallbackSequence = ((timestamp % 9999) || 1)
    return `${prefix}${fallbackSequence.toString().padStart(4, "0")}`
  }
}


// Generate unique Serial Number for tenant
async function generateSerialNumber(tenantId: string): Promise<string> {
  const prefix = "SN-"
  const year = new Date().getFullYear()
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0")

  const tables = getTenantTableNames(tenantId)
  const tableName = escapeId(tables.repairTickets)

  // Find the latest serial number for this month in tenant's table
  const latest = await queryOne(
    `SELECT serialNo FROM ${tableName} WHERE serialNo LIKE ? ORDER BY serialNo DESC LIMIT 1`,
    [`${prefix}${year}${month}-%`]
  )

  let sequence = 1
  if (latest && latest.serialNo) {
    const match = latest.serialNo.match(/\d+$/)
    if (match) {
      sequence = parseInt(match[0]) + 1
    }
  }

  return `${prefix}${year}${month}-${sequence.toString().padStart(4, "0")}`
}

// Client ID (NIF) is now required and must be provided manually by the user
// Auto-generation has been removed

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      clientId,
      customerName,
      contact,
      imeiNo,
      brand,
      model,
      softwareVersion,
      warranty,
      simCard,
      memoryCard,
      charger,
      battery,
      waterDamaged,
      loanEquipment,
      equipmentObs,
      repairObs,
      selectedServices,
      condition,
      problem,
      price,
      status,
    } = body

    // Validate required fields (clientId is now required, not auto-generated)
    // Note: problem (technician notes), equipmentObs, and repairObs are optional
    if (!userId || !customerName || !contact || !imeiNo || !brand || !model || price === undefined || !clientId || clientId.trim() === "") {
      return NextResponse.json(
        { error: "Missing required fields. Client NIF, Customer Name, Contact, IMEI, Brand, Model, and Price are required." },
        { status: 400 }
      )
    }

    // Validate IMEI: exactly 15 digits, numeric only
    if (!/^\d{15}$/.test(imeiNo)) {
      return NextResponse.json(
        { error: "IMEI must be exactly 15 digits and numeric only" },
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
      console.log(`[API] Creating tenant tables for tenantId: ${user.tenantId}`)
      await createTenantTables(user.tenantId)
      console.log(`[API] ✅ Tenant tables created for user: ${userId}`)
    } else {
      // Migrate existing tables to add any missing columns
      await migrateTenantTables(user.tenantId)
    }

    const tables = getTenantTableNames(user.tenantId)
    const tableName = escapeId(tables.repairTickets)
    console.log(`[API] Saving repair ticket to tenant table: ${tables.repairTickets} for tenantId: ${user.tenantId}`)

    // Check for duplicate IMEI in tenant's table
    const existingIMEI = await queryOne(
      `SELECT id FROM ${tableName} WHERE imeiNo = ? LIMIT 1`,
      [imeiNo]
    )

    if (existingIMEI) {
      return NextResponse.json(
        { error: "IMEI already exists. Please use a different IMEI." },
        { status: 400 }
      )
    }

    // Client ID is now required and must be provided (no auto-generation)
    if (!clientId || clientId.trim() === "") {
      return NextResponse.json(
        { error: "Client NIF is required and cannot be empty" },
        { status: 400 }
      )
    }

    // Serial number should come from the request body (manual input) - OPTIONAL
    const serialNoFromBody = body.serialNo || body.serialNumber || null
    let finalSerialNo: string | null = null
    if (serialNoFromBody && typeof serialNoFromBody === 'string' && serialNoFromBody.trim() !== "") {
      finalSerialNo = serialNoFromBody.trim()
    }

    // Client ID is required and provided by user (no auto-generation)
    const finalClientId = clientId.trim()

    try {
      // Create repair ticket in tenant-specific table
      // Insert WITHOUT repairNumber first to get auto-increment repairId
      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Insert row and get the auto-increment repairId
      // Use connection directly to get insertId
      const connection = await getConnection()
      try {
        const [insertResult] = await connection.execute(
          `INSERT INTO ${tableName} (id, userId, clientId, customerName, contact, imeiNo,
            brand, model, serialNo, softwareVersion, warranty, simCard, memoryCard,
            charger, battery, waterDamaged, loanEquipment, equipmentObs, repairObs,
            selectedServices, \`condition\`, problem, price, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ticketId,
            userId,
            finalClientId || null,
            customerName,
            contact,
            imeiNo,
            brand,
            model,
            finalSerialNo || null,
            softwareVersion || null,
            warranty || "Without Warranty",
            simCard || false,
            memoryCard || false,
            charger || false,
            battery || false,
            waterDamaged || false,
            loanEquipment || false,
            equipmentObs || null,
            repairObs || null,
            JSON.stringify(selectedServices || []),
            condition || null,
            problem,
            parseFloat(price),
            status || "PENDING"
          ]
        ) as mysql.ResultSetHeader[]

        // Get the auto-increment repairId from insert result
        let repairId = insertResult.insertId

        if (!repairId) {
          // If we can't get insertId, fetch it from the database
          const [rows] = await connection.execute(
            `SELECT repairId FROM ${tableName} WHERE id = ?`,
            [ticketId]
          ) as any[]
          if (!rows || rows.length === 0 || !rows[0].repairId) {
            connection.release()
            throw new Error("Failed to get repairId after insert")
          }
          repairId = rows[0].repairId
        }

        // Generate repairNumber based on repairId (guaranteed unique)
        const year = new Date().getFullYear()
        const repairNumber = `${year}-${repairId.toString().padStart(4, "0")}`

        // Update the row with repairNumber
        await connection.execute(
          `UPDATE ${tableName} SET repairNumber = ? WHERE repairId = ?`,
          [repairNumber, repairId]
        )
        
        connection.release()
      } catch (connError: any) {
        if (connection) {
          connection.release()
        }
        throw connError
      }
      
      // Fetch created ticket
      ticket = await queryOne(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [ticketId]
      )
      
      console.log(`[API] ✅ Repair ticket saved successfully to tenant table: ${tables.repairTickets}`)
      console.log(`[API] Ticket ID: ${ticketId}, Repair ID: ${repairId}, Repair Number: ${repairNumber}, Tenant: ${user.tenantId}`)
      
    } catch (error: any) {
      console.error("[API] Error creating repair ticket:", error)
      
      // If it's a duplicate entry error for IMEI, return error immediately
      if (error.code === "ER_DUP_ENTRY") {
        const duplicateField = error.sqlMessage?.includes("imeiNo")
          ? "imeiNo"
          : error.sqlMessage?.includes("repairNumber")
          ? "repairNumber"
          : "unknown"
        
        if (duplicateField === "imeiNo") {
          return NextResponse.json(
            { error: "IMEI already exists. Please use a different IMEI." },
            { status: 400 }
          )
        }
        
        // This should not happen with repairId-based generation, but handle it
        return NextResponse.json(
          { error: "Generated repair number already exists. Please try again." },
          { status: 400 }
        )
      }
      
      // Re-throw to be handled by outer catch
      throw error
    }

    // If ticket was not created, return error
    if (!ticket) {
      return NextResponse.json(
        { error: "Failed to create repair ticket. Please try again." },
        { status: 500 }
      )
    }

    // Parse JSON fields if they exist
    if (ticket) {
      // Parse selectedServices if it's a JSON string
      if (ticket.selectedServices && typeof ticket.selectedServices === 'string') {
        try {
          ticket.selectedServices = JSON.parse(ticket.selectedServices)
        } catch (e) {
          console.error("[API] Error parsing selectedServices:", e)
          ticket.selectedServices = []
        }
      }
    }

    return NextResponse.json(
      {
        message: "Repair ticket created successfully",
        ticket,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("[API] Error creating repair ticket:", error)
    console.error("[API] Error details:", {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      stack: error?.stack?.substring(0, 500),
    })

    // Handle MySQL unique constraint violations
    if (error.code === "ER_DUP_ENTRY") {
      const duplicateField = error.sqlMessage?.includes("repairNumber") 
        ? "repair number" 
        : error.sqlMessage?.includes("imeiNo")
        ? "IMEI"
        : "field"
      
      return NextResponse.json(
        { error: `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists. Please use a different value.` },
        { status: 400 }
      )
    }

    // Handle connection errors
    if (error.code === "ECONNREFUSED" || error.message?.includes("connect") || error.code === "ECONNRESET") {
      return NextResponse.json(
        { error: "Database connection error. Please try again later." },
        { status: 503 }
      )
    }

    // Handle table not found errors
    if (error.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json(
        { error: "Database table not found. Please contact support." },
        { status: 500 }
      )
    }

    // Handle SQL syntax errors (column count mismatch, etc.)
    if (error.code === "ER_WRONG_VALUE_COUNT_ON_ROW" || error.code === "21S01") {
      return NextResponse.json(
        { error: "Data validation error. Please check all fields and try again." },
        { status: 400 }
      )
    }

    // Provide more detailed error message - always show specific errors
    const errorMessage = error?.sqlMessage || error?.message || "Failed to create repair ticket. Please try again."

    return NextResponse.json(
      { 
        error: errorMessage,
        details: {
          code: error?.code,
          sqlState: error?.sqlState,
        }
      },
      { status: 500 }
    )
  }
}
