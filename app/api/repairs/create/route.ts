import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute, escapeId } from "@/lib/mysql"
import { getTenantTableNames, createTenantTables, tenantTablesExist } from "@/lib/tenant-db"

// Generate unique Repair Number for tenant (format: YYYY-XXXX)
async function generateRepairNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${year}-`

  const tables = getTenantTableNames(tenantId)
  const tableName = escapeId(tables.repairTickets)

  // Find the latest repair number for this year in tenant's table
  // Support both old format (REP-YYYY-XXXX) and new format (YYYY-XXXX)
  const latest = await queryOne(
    `SELECT repairNumber FROM ${tableName} WHERE repairNumber LIKE ? OR repairNumber LIKE ? ORDER BY repairNumber DESC LIMIT 1`,
    [`${prefix}%`, `REP-${prefix}%`]
  )

  let sequence = 1
  if (latest && latest.repairNumber) {
    // Extract sequence number from either format: YYYY-XXXX or REP-YYYY-XXXX
    const match = latest.repairNumber.match(/(\d{4})$/);
    if (match) {
      sequence = parseInt(match[1]) + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`
}

// Generate unique SPU based on service for tenant
async function generateSPU(service: string, tenantId: string): Promise<string> {
  const servicePrefixes: { [key: string]: string } = {
    "LCD Repair": "SCR",
    "Screen Replacement": "SCR",
    "Battery Change": "BAT",
    "Charging IC Repair": "CHG",
    "Software Update": "SWU",
    "Data Recovery": "DAT",
    "Water Damage": "WAT",
    "Other": "OTH",
  }

  const prefix = servicePrefixes[service] || "SRV"
  const spuPrefix = `SPU-${prefix}-`

  const tables = getTenantTableNames(tenantId)
  const tableName = escapeId(tables.repairTickets)

  // Find the latest SPU with this prefix in tenant's table
  const latest = await queryOne(
    `SELECT spu FROM ${tableName} WHERE spu LIKE ? ORDER BY spu DESC LIMIT 1`,
    [`${spuPrefix}%`]
  )

  let sequence = 1
  if (latest) {
    const match = latest.spu.match(/\d+$/)
    if (match) {
      sequence = parseInt(match[0]) + 1
    }
  }

  return `${spuPrefix}${sequence.toString().padStart(3, "0")}`
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
    if (!userId || !customerName || !contact || !imeiNo || !brand || !model || !problem || price === undefined || !clientId || clientId.trim() === "") {
      return NextResponse.json(
        { error: "Missing required fields. Client NIF is required." },
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

    // Generate unique identifiers
    let repairNumber: string
    let spu: string
    let serialNo: string

    // Client ID is now required and must be provided (no auto-generation)
    if (!clientId || clientId.trim() === "") {
      return NextResponse.json(
        { error: "Client NIF is required and cannot be empty" },
        { status: 400 }
      )
    }

    // Serial number should come from the request body (manual input)
    const serialNoFromBody = body.serialNo || body.serialNumber || ""
    let finalSerialNo: string

    try {
      repairNumber = await generateRepairNumber(user.tenantId)
      const firstService = Array.isArray(selectedServices) && selectedServices.length > 0
        ? selectedServices[0]
        : "Other"
      spu = await generateSPU(firstService, user.tenantId)
      // Serial number is now manual input, not auto-generated
      // Only generate if not provided (for backward compatibility)
      if (!serialNoFromBody || serialNoFromBody.trim() === "") {
        // Fallback: generate if not provided (for backward compatibility)
        finalSerialNo = await generateSerialNumber(user.tenantId)
      } else {
        finalSerialNo = serialNoFromBody.trim()
      }
    } catch (error) {
      console.error("[API] Error generating identifiers:", error)
      // Fallback generation
      const timestamp = Date.now()
      repairNumber = `${new Date().getFullYear()}-${timestamp.toString().slice(-4)}`
      spu = `SPU-OTH-${timestamp.toString().slice(-3)}`
      if (!serialNoFromBody || serialNoFromBody.trim() === "") {
        finalSerialNo = `SN-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${timestamp.toString().slice(-4)}`
      } else {
        finalSerialNo = serialNoFromBody.trim()
      }
    }

    // Check for duplicates (shouldn't happen, but safety check)
    const existingRepair = await queryOne(
      `SELECT id FROM ${tableName} WHERE repairNumber = ? OR spu = ? LIMIT 1`,
      [repairNumber, spu]
    )

    if (existingRepair) {
      return NextResponse.json(
        { error: "Generated repair number or SPU already exists. Please try again." },
        { status: 500 }
      )
    }

    // Create repair ticket in tenant-specific table
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Client ID is required and provided by user (no auto-generation)
    const finalClientId = clientId.trim()

    await execute(
      `INSERT INTO ${tableName} (id, userId, repairNumber, spu, clientId, customerName, contact, imeiNo,
        brand, model, serialNo, softwareVersion, warranty, simCard, memoryCard,
        charger, battery, waterDamaged, loanEquipment, equipmentObs, repairObs,
        selectedServices, \`condition\`, problem, price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketId,
        userId,
        repairNumber,
        spu,
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
    )

    // Fetch created ticket
    const ticket = await queryOne(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [ticketId]
    )
    
    console.log(`[API] ✅ Repair ticket saved successfully to tenant table: ${tables.repairTickets}`)
    console.log(`[API] Ticket ID: ${ticketId}, Repair Number: ${repairNumber}, Tenant: ${user.tenantId}`)

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
      return NextResponse.json(
        { error: "Repair number, SPU, or IMEI already exists. Please use a different value." },
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

    // Provide more detailed error message in development
    const errorMessage = process.env.NODE_ENV === "development" 
      ? (error?.message || error?.sqlMessage || "Failed to create repair ticket. Please try again.")
      : "Failed to create repair ticket. Please try again."

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? {
          code: error?.code,
          sqlMessage: error?.sqlMessage,
        } : undefined
      },
      { status: 500 }
    )
  }
}
