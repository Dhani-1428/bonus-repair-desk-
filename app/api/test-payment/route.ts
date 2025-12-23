import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute } from "@/lib/mysql"

/**
 * Test endpoint to verify payment API setup
 * Checks if payment_requests table exists and can be queried
 */
export async function GET(request: NextRequest) {
  try {
    const diagnostics: any = {
      success: true,
      database: {
        name: process.env.DB_NAME || "admin_panel_db",
        current_db: null,
      },
      tableExists: false,
      tableStructure: null,
      canInsert: false,
      canQuery: false,
      errors: [],
    }

    // Get current database
    try {
      const dbResult = await queryOne("SELECT DATABASE() as current_db")
      diagnostics.database.current_db = dbResult?.current_db || "unknown"
    } catch (e: any) {
      diagnostics.errors.push(`Failed to get current database: ${e.message}`)
    }

    // Check if payment_requests table exists
    try {
      const tableCheck = await queryOne(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() 
         AND table_name = 'payment_requests'`
      )
      diagnostics.tableExists = (tableCheck?.count || 0) > 0
    } catch (e: any) {
      diagnostics.errors.push(`Error checking table existence: ${e.message}`)
    }

    // Get table structure if it exists
    if (diagnostics.tableExists) {
      try {
        const structure = await query(
          `DESCRIBE payment_requests`
        )
        diagnostics.tableStructure = structure
      } catch (e: any) {
        diagnostics.errors.push(`Error getting table structure: ${e.message}`)
      }
    }

    // Try to query the table
    if (diagnostics.tableExists) {
      try {
        const testQuery = await query("SELECT COUNT(*) as count FROM payment_requests")
        diagnostics.canQuery = true
        diagnostics.recordCount = testQuery[0]?.count || 0
      } catch (e: any) {
        diagnostics.errors.push(`Error querying table: ${e.message}`)
        diagnostics.queryError = {
          code: e?.code,
          sqlState: e?.sqlState,
          sqlMessage: e?.sqlMessage,
        }
      }
    }

    // Try to create table if it doesn't exist
    if (!diagnostics.tableExists) {
      try {
        await execute(`
          CREATE TABLE IF NOT EXISTS payment_requests (
            id VARCHAR(36) PRIMARY KEY,
            userId VARCHAR(36) NOT NULL,
            tenantId VARCHAR(36) NOT NULL,
            plan ENUM('MONTHLY', 'THREE_MONTH', 'SIX_MONTH', 'TWELVE_MONTH') NOT NULL,
            planName VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            months INT NOT NULL,
            startDate DATETIME NOT NULL,
            endDate DATETIME NOT NULL,
            status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_userId (userId),
            INDEX idx_tenantId (tenantId),
            INDEX idx_status (status)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `)
        diagnostics.tableCreated = true
        diagnostics.tableExists = true
      } catch (e: any) {
        diagnostics.errors.push(`Error creating table: ${e.message}`)
        diagnostics.createTableError = {
          code: e?.code,
          sqlState: e?.sqlState,
          sqlMessage: e?.sqlMessage,
        }
      }
    }

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error: any) {
    console.error("[API] Error in test-payment endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to test payment setup",
        code: error?.code,
        sqlState: error?.sqlState,
      },
      { status: 500 }
    )
  }
}

