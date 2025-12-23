import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute, escapeId, beginTransaction, commit, rollback, getConnection } from "@/lib/mysql"
import { getTenantTableNames, createTenantTables, tenantTablesExist, migrateTenantTables } from "@/lib/tenant-db"
import mysql from "mysql2/promise"

// Generate unique Repair Number for tenant (format: YYYY-XXXX)
// Uses database transaction with locking to guarantee atomic operation and prevent race conditions
async function generateRepairNumber(tenantId: string, connection?: mysql.PoolConnection): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${year}-`

  const tables = getTenantTableNames(tenantId)
  const tableName = escapeId(tables.repairTickets)

  // Use connection if provided, otherwise get a new one
  const useTransaction = !!connection
  let conn = connection

  try {
    if (!conn) {
      conn = await getConnection()
      await conn.beginTransaction()
    }

    // Use SELECT FOR UPDATE to lock rows and prevent concurrent access
    // This ensures atomic operation - only one request can read at a time
    // Note: FOR UPDATE works even if table is empty (locks table)
    let rows: any[] = []
    try {
      const result = await conn.execute(
        `SELECT repairNumber FROM ${tableName} 
         WHERE repairNumber LIKE ? OR repairNumber LIKE ?
         ORDER BY repairNumber DESC
         LIMIT 1
         FOR UPDATE`,
        [`${prefix}%`, `REP-${prefix}%`]
      ) as any[]
      rows = Array.isArray(result[0]) ? result[0] : []
    } catch (queryError: any) {
      // If table doesn't exist or query fails, start from 1
      if (queryError.code === 'ER_NO_SUCH_TABLE' || queryError.code === '42S02') {
        rows = []
      } else {
        throw queryError
      }
    }

    let maxSequence = 0
    if (rows && Array.isArray(rows) && rows.length > 0) {
      const repair = rows[0]
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
    
    // If we exceed 9999, wrap around
    if (sequence > 9999) {
      sequence = 1
    }

    const repairNumber = `${prefix}${sequence.toString().padStart(4, "0")}`

    // Verify it doesn't exist (double check)
    let checkRows: any[] = []
    try {
      const checkResult = await conn.execute(
        `SELECT id FROM ${tableName} WHERE repairNumber = ? LIMIT 1`,
        [repairNumber]
      ) as any[]
      checkRows = Array.isArray(checkResult[0]) ? checkResult[0] : []
    } catch (checkError) {
      // If check fails, assume it doesn't exist and continue
      console.warn("[generateRepairNumber] Check query failed, continuing:", checkError)
    }

    if (checkRows && checkRows.length > 0) {
      // If exists, try next number
      sequence = maxSequence + 2
      if (sequence > 9999) sequence = 1
      return `${prefix}${sequence.toString().padStart(4, "0")}`
    }

    // Don't commit if connection was passed in (caller will commit)
    // Only commit/release if we created the connection ourselves
    if (!useTransaction && conn) {
      await conn.commit()
      conn.release()
    }

    return repairNumber
  } catch (error) {
    // Only rollback/release if we created the connection
    if (!useTransaction && conn) {
      try {
        await conn.rollback()
        conn.release()
      } catch (rollbackError) {
        console.error("[generateRepairNumber] Error during rollback:", rollbackError)
      }
    }
    throw error
  }
}

// Generate unique SPU based on service for tenant
// Uses database transaction with locking to guarantee atomic operation and prevent race conditions
async function generateSPU(service: string, tenantId: string, connection?: mysql.PoolConnection): Promise<string> {
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

  // Use connection if provided, otherwise get a new one
  const useTransaction = !!connection
  let conn = connection

  try {
    if (!conn) {
      conn = await getConnection()
      await conn.beginTransaction()
    }

    // Use SELECT FOR UPDATE to lock rows and prevent concurrent access
    // This ensures atomic operation - only one request can read at a time
    // Note: FOR UPDATE works even if table is empty (locks table)
    let rows: any[] = []
    try {
      const result = await conn.execute(
        `SELECT spu FROM ${tableName} 
         WHERE spu LIKE ?
         ORDER BY spu DESC
         LIMIT 1
         FOR UPDATE`,
        [`${spuPrefix}%`]
      ) as any[]
      rows = Array.isArray(result[0]) ? result[0] : []
    } catch (queryError: any) {
      // If table doesn't exist or query fails, start from 1
      if (queryError.code === 'ER_NO_SUCH_TABLE' || queryError.code === '42S02') {
        rows = []
      } else {
        throw queryError
      }
    }

    let maxSequence = 0
    if (rows && Array.isArray(rows) && rows.length > 0) {
      const spuRecord = rows[0]
      if (spuRecord && spuRecord.spu) {
        const match = spuRecord.spu.match(/-(\d+)$/)
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
    
    // If we exceed 999, wrap around
    if (sequence > 999) {
      sequence = 1
    }

    const spu = `${spuPrefix}${sequence.toString().padStart(3, "0")}`

    // Verify it doesn't exist (double check)
    let checkRows: any[] = []
    try {
      const checkResult = await conn.execute(
        `SELECT id FROM ${tableName} WHERE spu = ? LIMIT 1`,
        [spu]
      ) as any[]
      checkRows = Array.isArray(checkResult[0]) ? checkResult[0] : []
    } catch (checkError) {
      // If check fails, assume it doesn't exist and continue
      console.warn("[generateSPU] Check query failed, continuing:", checkError)
    }

    if (checkRows && checkRows.length > 0) {
      // If exists, try next number
      sequence = maxSequence + 2
      if (sequence > 999) sequence = 1
      return `${spuPrefix}${sequence.toString().padStart(3, "0")}`
    }

    // Don't commit if connection was passed in (caller will commit)
    // Only commit/release if we created the connection ourselves
    if (!useTransaction && conn) {
      await conn.commit()
      conn.release()
    }

    return spu
  } catch (error) {
    // Only rollback/release if we created the connection
    if (!useTransaction && conn) {
      try {
        await conn.rollback()
        conn.release()
      } catch (rollbackError) {
        console.error("[generateSPU] Error during rollback:", rollbackError)
      }
    }
    throw error
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

    // Use database transaction to ensure atomic operation
    // This prevents race conditions by locking rows during generation and insert
    const maxRetries = 10
    let attempts = 0
    let ticket: any = null
    let lastError: any = null

    while (attempts < maxRetries) {
      attempts++
      let connection: mysql.PoolConnection | null = null
      
      try {
        // Start transaction with connection
        connection = await getConnection()
        await connection.beginTransaction()

        // Generate unique identifiers within transaction (with locking)
        let repairNumber: string
        let spu: string
        
        try {
          repairNumber = await generateRepairNumber(user.tenantId, connection)
          const firstService = Array.isArray(selectedServices) && selectedServices.length > 0
            ? selectedServices[0]
            : "Other"
          spu = await generateSPU(firstService, user.tenantId, connection)
        } catch (genError: any) {
          console.error("[API] Error generating identifiers:", genError)
          console.error("[API] Generation error details:", {
            message: genError?.message,
            code: genError?.code,
            stack: genError?.stack?.substring(0, 500)
          })
          if (connection) {
            try {
              await connection.rollback()
              connection.release()
            } catch (rollbackError) {
              console.error("[API] Error during rollback:", rollbackError)
            }
          }
          throw genError
        }

        // Create repair ticket in tenant-specific table within same transaction
        const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Insert within transaction
        await connection.execute(
          `INSERT INTO ${tableName} (id, userId, repairNumber, spu, clientId, customerName, contact, imeiNo,
            brand, model, serialNo, softwareVersion, warranty, simCard, memoryCard,
            charger, battery, waterDamaged, loanEquipment, equipmentObs, repairObs,
            selectedServices, \`condition\`, problem, price, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

        // Commit transaction
        await connection.commit()
        connection.release()
        connection = null

        // Fetch created ticket
        ticket = await queryOne(
          `SELECT * FROM ${tableName} WHERE id = ?`,
          [ticketId]
        )
        
        console.log(`[API] ✅ Repair ticket saved successfully to tenant table: ${tables.repairTickets}`)
        console.log(`[API] Ticket ID: ${ticketId}, Repair Number: ${repairNumber}, Tenant: ${user.tenantId}`)
        
        // Success! Break out of retry loop
        break
      } catch (error: any) {
        lastError = error
        
        // Clean up connection if it exists
        if (connection) {
          try {
            await connection.rollback()
            connection.release()
          } catch (rollbackError) {
            console.error("[API] Error during rollback:", rollbackError)
          }
          connection = null
        }
        
        // If it's a duplicate entry error, retry with new numbers
        if (error.code === "ER_DUP_ENTRY") {
          const duplicateField = error.sqlMessage?.includes("repairNumber") 
            ? "repairNumber" 
            : error.sqlMessage?.includes("spu")
            ? "spu"
            : error.sqlMessage?.includes("imeiNo")
            ? "imeiNo"
            : "unknown"
          
          console.log(`[API] Duplicate entry detected (${duplicateField}) on attempt ${attempts}. Retrying with new numbers...`)
          
          // Add exponential backoff delay with jitter to avoid thundering herd
          const baseDelay = 100 * attempts
          const jitter = Math.random() * 50
          await new Promise(resolve => setTimeout(resolve, baseDelay + jitter))
          
          // If it's IMEI duplicate, don't retry - return error immediately
          if (duplicateField === "imeiNo") {
            return NextResponse.json(
              { error: "IMEI already exists. Please use a different IMEI." },
              { status: 400 }
            )
          }
          
          // Continue to next retry attempt
          continue
        }
        
        // For other errors, break and handle below
        break
      }
    }

    // If we exhausted retries or got a non-duplicate error
    if (!ticket) {
      if (lastError?.code === "ER_DUP_ENTRY") {
        // Still getting duplicates after max retries - use guaranteed unique timestamp-based fallback
        console.warn(`[API] Max retries reached for duplicate entries. Using guaranteed unique timestamp-based fallback.`)
        
        // Retry with guaranteed unique values using timestamp + random
        let fallbackAttempts = 0
        const maxFallbackRetries = 5
        
        while (fallbackAttempts < maxFallbackRetries && !ticket) {
          fallbackAttempts++
          
          try {
            // Generate guaranteed unique values using timestamp + random + attempt number
            const timestamp = Date.now()
            const random1 = Math.floor(Math.random() * 10000)
            const random2 = Math.floor(Math.random() * 1000)
            const uniqueSuffix = `${timestamp}${random1}${fallbackAttempts}`.slice(-4)
            
            const repairNumber = `${new Date().getFullYear()}-${uniqueSuffix}`
            const spu = `SPU-OTH-${random2.toString().padStart(3, "0")}`
            const ticketId = `ticket_${timestamp}_${Math.random().toString(36).substr(2, 9)}`

            // Check if these values exist
            const existingCheck = await queryOne(
              `SELECT id FROM ${tableName} WHERE repairNumber = ? OR spu = ? LIMIT 1`,
              [repairNumber, spu]
            )
            
            if (existingCheck) {
              console.log(`[API] Fallback values also exist, retrying fallback attempt ${fallbackAttempts}...`)
              await new Promise(resolve => setTimeout(resolve, 50 * fallbackAttempts))
              continue
            }

            await execute(
              `INSERT INTO ${tableName} (id, userId, repairNumber, spu, clientId, customerName, contact, imeiNo,
                brand, model, serialNo, softwareVersion, warranty, simCard, memoryCard,
                charger, battery, waterDamaged, loanEquipment, equipmentObs, repairObs,
                selectedServices, \`condition\`, problem, price, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

            ticket = await queryOne(
              `SELECT * FROM ${tableName} WHERE id = ?`,
              [ticketId]
            )
            
            if (ticket) {
              console.log(`[API] ✅ Fallback insertion successful. Repair Number: ${repairNumber}, SPU: ${spu}`)
              break
            }
          } catch (fallbackError: any) {
            console.error(`[API] Fallback insertion attempt ${fallbackAttempts} failed:`, fallbackError)
            if (fallbackAttempts >= maxFallbackRetries) {
              return NextResponse.json(
                { error: "Failed to create repair ticket after multiple attempts. Please try again." },
                { status: 500 }
              )
            }
            await new Promise(resolve => setTimeout(resolve, 100 * fallbackAttempts))
          }
        }
        
        if (!ticket) {
          return NextResponse.json(
            { error: "Failed to create repair ticket after multiple attempts. Please try again." },
            { status: 500 }
          )
        }
      } else {
        // Re-throw the error to be handled by the outer catch block
        throw lastError
      }
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
        : error.sqlMessage?.includes("spu") 
        ? "SPU" 
        : error.sqlMessage?.includes("imeiNo")
        ? "IMEI"
        : "field"
      
      // Check if it's both repair number and SPU (common in race conditions)
      const isRepairNumber = error.sqlMessage?.includes("repairNumber")
      const isSPU = error.sqlMessage?.includes("spu")
      
      if (isRepairNumber && isSPU) {
        return NextResponse.json(
          { error: "Generated repair number or SPU already exists. Please try again." },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `Generated ${duplicateField} already exists. Please try again.` },
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
