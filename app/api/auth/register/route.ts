import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute } from "@/lib/mysql"
import bcrypt from "bcryptjs"
import { createTenantTables } from "@/lib/tenant-db"
import { v4 as uuidv4 } from "uuid"
import { sendAdminSignupNotification } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, shopName, contactNumber, selectedPlan } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    let existingUser
    try {
      existingUser = await queryOne(
        `SELECT id FROM users WHERE email = ?`,
        [email]
      )
    } catch (dbError: any) {
      console.error("[API] Error checking existing user:", dbError?.message || dbError)
      throw new Error(`Database error: ${dbError?.message || "Failed to check existing users"}`)
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 10)
    } catch (hashError: any) {
      console.error("[API] Error hashing password:", hashError?.message || hashError)
      throw new Error("Failed to process password")
    }

    // Generate IDs
    const userId = uuidv4()
    const tenantId = uuidv4()

    // Create user
    try {
      await execute(
        `INSERT INTO users (id, name, email, password, shopName, contactNumber, role, tenantId)
         VALUES (?, ?, ?, ?, ?, ?, 'USER', ?)`,
        [userId, name, email, hashedPassword, shopName || null, contactNumber || null, tenantId]
      )
      console.log(`[API] ✅ User created successfully: ${email} (${userId})`)
    } catch (insertError: any) {
      console.error("[API] Error inserting user:", insertError?.message || insertError)
      console.error("[API] Insert error details:", {
        code: insertError?.code,
        errno: insertError?.errno,
        sqlState: insertError?.sqlState,
        sqlMessage: insertError?.sqlMessage,
      })
      
      if (insertError?.code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        )
      }
      
      throw new Error(`Failed to create user in database: ${insertError?.sqlMessage || insertError?.message || "Unknown error"}`)
    }

    // Get created user
    let user
    try {
      user = await queryOne(
        `SELECT id, name, email, role, shopName, contactNumber, tenantId, createdAt 
         FROM users WHERE id = ?`,
        [userId]
      )
      
      if (!user) {
        console.error(`[API] ⚠️  User created but not found: ${userId}`)
        throw new Error("User was created but could not be retrieved")
      }
    } catch (fetchError: any) {
      console.error("[API] Error fetching created user:", fetchError?.message || fetchError)
      throw new Error(`Failed to retrieve created user: ${fetchError?.message || "Unknown error"}`)
    }

    // Create tenant-specific tables for this user
    try {
      console.log(`[API] Creating tenant tables for tenantId: ${tenantId}`)
      await createTenantTables(tenantId)
      console.log(`[API] ✅ Tenant tables created successfully for user: ${email}`)
      
      // Verify tables were created
      const { tenantTablesExist } = await import("@/lib/tenant-db")
      const tablesExist = await tenantTablesExist(tenantId)
      if (tablesExist) {
        console.log(`[API] ✅ Verified: Tenant tables exist for ${email}`)
      } else {
        console.warn(`[API] ⚠️  Warning: Tenant tables verification failed for ${email}`)
      }
    } catch (error: any) {
      console.error("[API] Error creating tenant tables:", error?.message || error)
      // Don't fail registration - tables will be created on first use
      console.log("[API] Tables will be created automatically when user first creates data")
    }

    // Create free 15-day trial subscription
    // Calculate dates with proper timezone handling
    const subscriptionId = uuidv4()
    const startDate = new Date()
    // Normalize to start of day in local timezone to avoid timezone issues
    startDate.setHours(0, 0, 0, 0)
    startDate.setMinutes(0, 0, 0)
    startDate.setSeconds(0, 0)
    startDate.setMilliseconds(0)
    
    // Calculate end date: startDate + exactly 15 days
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 15) // Exactly 15 days free trial
    endDate.setHours(23, 59, 59, 999) // End of day (23:59:59.999)
    
    // Validate: endDate should be exactly 15 days after startDate
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff !== 15) {
      console.error(`[API] Warning: Trial end date calculation error. Expected 15 days, got ${daysDiff} days. Recalculating...`)
      // Recalculate to ensure correctness
      endDate.setTime(startDate.getTime())
      endDate.setDate(endDate.getDate() + 15)
      endDate.setHours(23, 59, 59, 999)
    }

    try {
      await execute(
        `INSERT INTO subscriptions (id, userId, tenantId, plan, status, startDate, endDate, isFreeTrial)
         VALUES (?, ?, ?, ?, 'FREE_TRIAL', ?, ?, TRUE)`,
        [subscriptionId, userId, tenantId, selectedPlan || "MONTHLY", startDate, endDate]
      )
      console.log(`[API] ✅ Subscription created for user: ${email}`)
    } catch (subError: any) {
      console.error("[API] Error creating subscription:", subError?.message || subError)
      // Don't fail registration if subscription creation fails - user is already created
      console.warn("[API] ⚠️  User created but subscription creation failed. User can still login.")
    }

    // Send admin notification about new signup (include password for admin reference)
    try {
      await sendAdminSignupNotification(user, password, selectedPlan || "MONTHLY")
    } catch (emailError) {
      console.error("[API] Error sending admin signup notification:", emailError)
      // Don't fail registration if email fails
    }

    return NextResponse.json({
      message: "User registered successfully",
      user,
    }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Register error:", error)
    console.error("[API] Register error details:", {
      message: error?.message || "Unknown error",
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      stack: error?.stack?.substring(0, 500),
    })
    
    // Determine specific error message
    let errorMessage = "Failed to create user"
    
    // Check for missing environment variables
    if (error?.code === "ENV_MISSING") {
      errorMessage = error.message || "Database configuration is missing. Please check your environment variables."
    } else if (error?.code === "ECONNREFUSED" || error?.code === "ETIMEDOUT" || error?.code === "ECONNRESET") {
      errorMessage = "Database connection failed. Please check your database configuration and network connectivity."
    } else if (error?.code === "ER_ACCESS_DENIED_ERROR") {
      errorMessage = "Database authentication failed. Please check your database credentials."
    } else if (error?.code === "ER_BAD_DB_ERROR") {
      errorMessage = `Database '${process.env.DB_NAME || "unknown"}' not found. Please check your database configuration.`
    } else if (error?.code === "ER_NO_SUCH_TABLE") {
      errorMessage = "Database table not found. Please run the database initialization script."
    } else if (error?.code === "ER_DUP_ENTRY") {
      errorMessage = "User with this email already exists."
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    // Add helpful hint for Vercel deployments
    if (process.env.VERCEL && error?.code !== "ER_DUP_ENTRY") {
      console.error("[API] ⚠️  Vercel deployment detected. Ensure all DB_* environment variables are set in Vercel project settings.")
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
        code: process.env.NODE_ENV === "development" ? error?.code : undefined
      },
      { status: 500 }
    )
  }
}
