import { NextRequest, NextResponse } from "next/server"
import { testConnection, query } from "@/lib/mysql"

/**
 * Test database connection endpoint
 * Useful for debugging connection issues
 */
export async function GET(request: NextRequest) {
  try {
    // Get all environment variables (for debugging)
    const allEnvVars = Object.keys(process.env)
      .filter(k => k.startsWith("DB_"))
      .reduce((acc, k) => {
        if (k === "DB_PASSWORD") {
          acc[k] = process.env[k] ? "✓ Set (hidden)" : "✗ Missing"
        } else {
          acc[k] = process.env[k] ? `✓ Set (${process.env[k]})` : "✗ Missing"
        }
        return acc
      }, {} as Record<string, string>)
    
    // Check environment variables
    const envCheck = {
      DB_HOST: process.env.DB_HOST ? `✓ Set (${process.env.DB_HOST})` : "✗ Missing",
      DB_PORT: process.env.DB_PORT ? `✓ Set (${process.env.DB_PORT})` : "✗ Missing",
      DB_USER: process.env.DB_USER ? `✓ Set (${process.env.DB_USER})` : "✗ Missing",
      DB_PASSWORD: process.env.DB_PASSWORD ? "✓ Set (hidden)" : "✗ Missing",
      DB_NAME: process.env.DB_NAME ? `✓ Set (${process.env.DB_NAME})` : "✗ Missing",
      DB_SSL: process.env.DB_SSL ? `✓ Set (${process.env.DB_SSL})` : "✗ Missing (default: auto-detect)",
    }
    
    // Additional Vercel info
    const vercelInfo = {
      VERCEL: process.env.VERCEL || "Not detected",
      VERCEL_ENV: process.env.VERCEL_ENV || "Not detected",
      NODE_ENV: process.env.NODE_ENV || "Not detected",
    }

    // Test connection
    const isConnected = await testConnection()
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        message: "Database connection failed",
        environment: envCheck,
        allDbEnvVars: allEnvVars,
        vercelInfo: vercelInfo,
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
        allDbEnvVars: allEnvVars,
        vercelInfo: vercelInfo,
        testQuery: result[0],
      })
    } catch (queryError: any) {
      return NextResponse.json({
        success: false,
        message: "Connection test passed but query failed",
        environment: envCheck,
        allDbEnvVars: allEnvVars,
        vercelInfo: vercelInfo,
        error: {
          code: queryError?.code,
          message: queryError?.message,
          sqlState: queryError?.sqlState,
        },
      }, { status: 500 })
    }
  } catch (error: any) {
      const allDbEnvVars = Object.keys(process.env)
        .filter(k => k.startsWith("DB_"))
        .reduce((acc, k) => {
          if (k === "DB_PASSWORD") {
            acc[k] = process.env[k] ? "✓ Set (hidden)" : "✗ Missing"
          } else {
            acc[k] = process.env[k] ? `✓ Set (${process.env[k]})` : "✗ Missing"
          }
          return acc
        }, {} as Record<string, string>)
      
      return NextResponse.json({
        success: false,
        message: "Database connection test failed",
        environment: envCheck,
        allDbEnvVars: allDbEnvVars,
        vercelInfo: vercelInfo,
        error: {
          code: error?.code,
          message: error?.message,
          sqlState: error?.sqlState,
          sqlMessage: error?.sqlMessage,
          missing: (error as any)?.missing,
        },
      }, { status: 500 })
  }
}

