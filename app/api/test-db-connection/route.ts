import { NextRequest, NextResponse } from "next/server"
import { testConnection, query } from "@/lib/mysql"

/**
 * Test database connection endpoint
 * Useful for debugging connection issues
 */
export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      DB_HOST: process.env.DB_HOST ? "✓ Set" : "✗ Missing",
      DB_PORT: process.env.DB_PORT ? `✓ Set (${process.env.DB_PORT})` : "✗ Missing",
      DB_USER: process.env.DB_USER ? "✓ Set" : "✗ Missing",
      DB_PASSWORD: process.env.DB_PASSWORD ? "✓ Set" : "✗ Missing",
      DB_NAME: process.env.DB_NAME ? `✓ Set (${process.env.DB_NAME})` : "✗ Missing",
      DB_SSL: process.env.DB_SSL ? `✓ Set (${process.env.DB_SSL})` : "✗ Missing (default: auto-detect)",
    }

    // Test connection
    const isConnected = await testConnection()
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        message: "Database connection failed",
        environment: envCheck,
        error: "Connection test returned false",
      }, { status: 500 })
    }

    // Try a simple query
    try {
      const result = await query("SELECT 1 as test, DATABASE() as current_db, NOW() as server_time")
      return NextResponse.json({
        success: true,
        message: "Database connection successful",
        environment: envCheck,
        testQuery: result[0],
      })
    } catch (queryError: any) {
      return NextResponse.json({
        success: false,
        message: "Connection test passed but query failed",
        environment: envCheck,
        error: {
          code: queryError?.code,
          message: queryError?.message,
          sqlState: queryError?.sqlState,
        },
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Database connection test failed",
      environment: {
        DB_HOST: process.env.DB_HOST ? "✓ Set" : "✗ Missing",
        DB_PORT: process.env.DB_PORT ? `✓ Set (${process.env.DB_PORT})` : "✗ Missing",
        DB_USER: process.env.DB_USER ? "✓ Set" : "✗ Missing",
        DB_PASSWORD: process.env.DB_PASSWORD ? "✓ Set" : "✗ Missing",
        DB_NAME: process.env.DB_NAME ? `✓ Set (${process.env.DB_NAME})` : "✗ Missing",
        DB_SSL: process.env.DB_SSL ? `✓ Set (${process.env.DB_SSL})` : "✗ Missing",
      },
      error: {
        code: error?.code,
        message: error?.message,
        sqlState: error?.sqlState,
        sqlMessage: error?.sqlMessage,
      },
    }, { status: 500 })
  }
}

