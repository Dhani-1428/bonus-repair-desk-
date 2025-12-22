import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/mysql"
import { getTenantTableNames } from "@/lib/tenant-db"

/**
 * Debug endpoint to check repair tickets data
 * Helps diagnose why data is not showing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get database info
    const dbInfo = await queryOne("SELECT DATABASE() as current_db")
    const dbName = dbInfo?.current_db || "unknown"

    // Get user info
    const user = await queryOne(
      `SELECT id, name, email, tenantId FROM users WHERE id = ?`,
      [userId]
    )

    if (!user) {
      return NextResponse.json({
        error: "User not found",
        debug: {
          database: dbName,
          userId,
          DB_NAME_env: process.env.DB_NAME,
        },
      }, { status: 404 })
    }

    // Get tenant table name
    const tables = getTenantTableNames(user.tenantId)
    const tableName = tables.repairTickets

    // Check if table exists
    let tableExists = false
    let ticketCount = 0
    let tickets: any[] = []

    try {
      const tableCheck = await queryOne(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() 
         AND table_name = ?`,
        [tableName]
      )
      tableExists = (tableCheck?.count || 0) > 0

      if (tableExists) {
        const countResult = await queryOne(
          `SELECT COUNT(*) as count FROM ${tableName} WHERE userId = ?`,
          [userId]
        )
        ticketCount = countResult?.count || 0

        if (ticketCount > 0) {
          tickets = await query(
            `SELECT id, repairNumber, customerName, createdAt FROM ${tableName} 
             WHERE userId = ? ORDER BY createdAt DESC LIMIT 5`,
            [userId]
          )
        }
      }
    } catch (error: any) {
      return NextResponse.json({
        error: "Error checking table",
        debug: {
          database: dbName,
          userId: user.id,
          userEmail: user.email,
          tenantId: user.tenantId,
          tableName,
          tableExists: false,
          error: error?.message || error,
          errorCode: error?.code,
          DB_NAME_env: process.env.DB_NAME,
        },
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      debug: {
        database: dbName,
        userId: user.id,
        userEmail: user.email,
        tenantId: user.tenantId,
        tableName,
        tableExists,
        ticketCount,
        tickets: tickets.map(t => ({
          id: t.id,
          repairNumber: t.repairNumber,
          customerName: t.customerName,
          createdAt: t.createdAt,
        })),
        DB_NAME_env: process.env.DB_NAME,
        DB_NAME_used: dbName,
        match: process.env.DB_NAME === dbName ? "✓ Match" : "✗ Mismatch - Check DB_NAME env var",
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      error: "Debug check failed",
      debug: {
        error: error?.message || error,
        errorCode: error?.code,
        DB_NAME_env: process.env.DB_NAME,
      },
    }, { status: 500 })
  }
}

