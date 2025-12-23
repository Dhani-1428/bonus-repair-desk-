import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute } from "@/lib/mysql"
import { v4 as uuidv4 } from "uuid"
import { sendAdminSubscriptionPurchaseNotification, sendAdminPaymentRequestNotification, sendPaymentApprovedEmail, sendPaymentRejectedEmail, sendPaymentReceiptEmail } from "@/lib/email-service"

// GET all payment requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    console.log("[API] Fetching payment requests, status filter:", status || "all")

    let sql = `
      SELECT 
        p.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.shopName as user_shopName,
        u.contactNumber as user_contactNumber
      FROM payment_requests p
      LEFT JOIN users u ON p.userId = u.id
    `

    const params: any[] = []

    if (status) {
      sql += ` WHERE p.status = ?`
      params.push(status)
    }

    sql += ` ORDER BY p.createdAt DESC`

    const payments = await query(sql, params)
    console.log("[API] Found", payments.length, "payment request(s)")

    // Transform results
    const formatted = (payments as any[]).map((p) => ({
      ...p,
      user: {
        id: p.user_id,
        name: p.user_name,
        email: p.user_email,
        shopName: p.user_shopName,
        contactNumber: p.user_contactNumber,
      },
    }))

    return NextResponse.json({ payments: formatted })
  } catch (error: any) {
    console.error("[API] ❌ Error fetching payment requests:", error?.message || error)
    console.error("[API] Error details:", {
      code: error?.code,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
    })
    return NextResponse.json(
      { 
        error: "Failed to fetch payment requests",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

// POST create payment request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      plan,
      planName,
      price,
      months,
      startDate,
      endDate,
    } = body

    // Validate required fields
    const missingFields = []
    if (!userId) missingFields.push("userId")
    if (!plan) missingFields.push("plan")
    if (!planName) missingFields.push("planName")
    if (price === undefined || price === null) missingFields.push("price")
    if (!months) missingFields.push("months")
    if (!startDate) missingFields.push("startDate")
    if (!endDate) missingFields.push("endDate")

    if (missingFields.length > 0) {
      console.error("[API] ❌ Missing required fields:", missingFields)
      return NextResponse.json(
        { 
          error: "Missing required fields",
          missingFields,
          received: { userId, plan, planName, price, months, startDate, endDate },
        },
        { status: 400 }
      )
    }

    // Get user to find tenantId
    console.log("[API] Looking up user:", userId)
    let user
    try {
      user = await queryOne(
        `SELECT tenantId FROM users WHERE id = ?`,
        [userId]
      )
    } catch (dbError: any) {
      console.error("[API] ❌ Database error looking up user:", dbError?.message || dbError)
      console.error("[API] Error details:", {
        code: dbError?.code,
        sqlState: dbError?.sqlState,
        sqlMessage: dbError?.sqlMessage,
      })
      return NextResponse.json(
        { 
          error: "Database error while looking up user",
          details: process.env.NODE_ENV === "development" ? dbError?.message : undefined,
        },
        { status: 500 }
      )
    }

    if (!user) {
      console.error("[API] ❌ User not found:", userId)
      return NextResponse.json(
        { error: `User not found with ID: ${userId}` },
        { status: 404 }
      )
    }
    
    console.log("[API] ✅ User found, tenantId:", user.tenantId)

    // Ensure payment_requests table exists (without foreign key to avoid constraint issues)
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
      console.log("[API] ✅ payment_requests table verified/created")
    } catch (tableError: any) {
      // If table already exists, that's fine - continue
      if (tableError?.code === "ER_TABLE_EXISTS_ERROR" || tableError?.code === 1050) {
        console.log("[API] ℹ️  payment_requests table already exists")
      } else {
        console.error("[API] ⚠️  Error ensuring payment_requests table exists:", tableError?.message || tableError)
        console.error("[API] Table error details:", {
          code: tableError?.code,
          sqlState: tableError?.sqlState,
          sqlMessage: tableError?.sqlMessage,
        })
        // Continue anyway - table might already exist with different structure
      }
    }

    const paymentId = uuidv4()

    // Validate and parse values
    const parsedPrice = parseFloat(price)
    const parsedMonths = parseInt(months)

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      console.error("[API] ❌ Invalid price:", price)
      return NextResponse.json(
        { error: "Invalid price value" },
        { status: 400 }
      )
    }

    if (isNaN(parsedMonths) || parsedMonths <= 0) {
      console.error("[API] ❌ Invalid months:", months)
      return NextResponse.json(
        { error: "Invalid months value" },
        { status: 400 }
      )
    }

    console.log("[API] Creating payment request:", {
      paymentId,
      userId,
      tenantId: user.tenantId,
      plan,
      planName,
      price: parsedPrice,
      months: parsedMonths,
      startDate,
      endDate,
    })

    try {
      console.log("[API] Inserting payment request into database with values:", {
        paymentId,
        userId,
        tenantId: user.tenantId,
        plan,
        planName,
        price: parsedPrice,
        months: parsedMonths,
        startDate,
        endDate,
      })
      
      await execute(
        `INSERT INTO payment_requests 
         (id, userId, tenantId, plan, planName, price, months, startDate, endDate, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [paymentId, userId, user.tenantId, plan, planName, parsedPrice, parsedMonths, startDate, endDate]
      )
      console.log("[API] ✅ Payment request inserted into database successfully")
    } catch (dbError: any) {
      console.error("[API] ❌ Database error creating payment request:", dbError?.message || dbError)
      console.error("[API] Error details:", {
        code: dbError?.code,
        errno: dbError?.errno,
        sqlState: dbError?.sqlState,
        sqlMessage: dbError?.sqlMessage,
        sql: dbError?.sql,
      })
      
      // Provide more specific error message
      if (dbError?.code === "ER_NO_SUCH_TABLE") {
        throw new Error("Database table 'payment_requests' does not exist. The table should have been created automatically.")
      } else if (dbError?.code === "ER_DUP_ENTRY") {
        throw new Error("Payment request with this ID already exists. Please try again.")
      } else if (dbError?.code === "ER_BAD_FIELD_ERROR") {
        throw new Error(`Database table structure error: ${dbError?.sqlMessage || "Invalid column name"}`)
      } else if (dbError?.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
        throw new Error(`Invalid data format: ${dbError?.sqlMessage || "Check date/price format"}`)
      }
      
      throw dbError // Re-throw to be caught by outer try-catch
    }

    // Fetch created payment with user data
    const payment = await queryOne(
      `SELECT 
        p.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.shopName as user_shopName,
        u.contactNumber as user_contactNumber
       FROM payment_requests p
       LEFT JOIN users u ON p.userId = u.id
       WHERE p.id = ?`,
      [paymentId]
    )

    const formatted = {
      ...payment,
      user: {
        id: payment.user_id,
        name: payment.user_name,
        email: payment.user_email,
        shopName: payment.user_shopName,
        contactNumber: payment.user_contactNumber,
      },
    }

    // Send receipt email to user
    try {
      if (!payment.user_id || !payment.user_email) {
        console.error("[API] ⚠️  Cannot send receipt email - missing user data:", {
          user_id: payment.user_id,
          user_email: payment.user_email,
        })
      } else {
        const userForReceipt = {
          id: payment.user_id,
          name: payment.user_name || "User",
          email: payment.user_email,
          shopName: payment.user_shopName || null,
          contactNumber: payment.user_contactNumber || null,
          role: "USER" as const,
          tenantId: payment.tenantId,
          createdAt: new Date().toISOString(),
        }
        console.log("[API] Sending payment receipt email to user:", userForReceipt.email)
        const receiptEmailSent = await sendPaymentReceiptEmail(userForReceipt, formatted)
        if (receiptEmailSent) {
          console.log("[API] ✅ Payment receipt email sent successfully to user")
        } else {
          console.error("[API] ⚠️  Payment receipt email returned false - email may not have been sent")
        }
      }
    } catch (emailError: any) {
      console.error("[API] ❌ Error sending payment receipt email:", emailError?.message || emailError)
      console.error("[API] Error details:", {
        message: emailError?.message,
        stack: emailError?.stack?.substring(0, 500),
      })
      // Don't fail payment creation if email fails
    }

    // Send admin notification about new payment request
    try {
      if (!payment.user_id || !payment.user_email) {
        console.error("[API] ⚠️  Cannot send admin notification - missing user data:", {
          user_id: payment.user_id,
          user_email: payment.user_email,
        })
      } else {
        const user = {
          id: payment.user_id,
          name: payment.user_name || "User",
          email: payment.user_email,
          shopName: payment.user_shopName || null,
          contactNumber: payment.user_contactNumber || null,
          role: "USER" as const,
          tenantId: payment.tenantId,
          createdAt: new Date().toISOString(),
        }
        console.log("[API] Sending admin payment request notification to bonusrepairdesk@gmail.com for payment:", formatted.id)
        console.log("[API] Payment details:", {
          id: formatted.id,
          plan: formatted.planName || formatted.plan,
          price: formatted.price,
          user: user.name,
          userEmail: user.email,
        })
        const emailSent = await sendAdminPaymentRequestNotification(formatted, user)
        if (emailSent) {
          console.log("[API] ✅ Admin payment request notification sent successfully to bonusrepairdesk@gmail.com")
        } else {
          console.error("[API] ⚠️  Admin payment request notification returned false - email may not have been sent")
        }
      }
    } catch (emailError: any) {
      console.error("[API] ❌ Error sending admin payment request notification:", emailError?.message || emailError)
      console.error("[API] Error details:", {
        message: emailError?.message,
        code: emailError?.code,
        response: emailError?.response,
        stack: emailError?.stack?.substring(0, 500),
      })
      // Don't fail payment creation if email fails, but log the error clearly
    }

    console.log("[API] ✅ Payment request created successfully:", paymentId)
    return NextResponse.json({ payment: formatted }, { status: 201 })
  } catch (error: any) {
    console.error("[API] ❌ Error creating payment request:", error?.message || error)
    console.error("[API] Error details:", {
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      stack: error?.stack?.substring(0, 500),
    })
    
    // Determine specific error message
    let errorMessage = "Failed to create payment request"
    let errorDetails: any = {}
    
    if (error?.code === "ER_NO_SUCH_TABLE") {
      errorMessage = "Database table 'payment_requests' does not exist. Please run the database initialization script."
      errorDetails.table = "payment_requests"
    } else if (error?.code === "ER_DUP_ENTRY") {
      errorMessage = "Payment request already exists with this ID. Please try again."
    } else if (error?.code === "ECONNREFUSED" || error?.code === "ETIMEDOUT") {
      errorMessage = "Database connection failed. Please try again later."
    } else if (error?.code === "ER_ACCESS_DENIED_ERROR") {
      errorMessage = "Database authentication failed. Please check database credentials."
    } else if (error?.code === "ER_BAD_DB_ERROR") {
      errorMessage = `Database '${process.env.DB_NAME || "unknown"}' not found. Please check your database configuration.`
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
        code: process.env.NODE_ENV === "development" ? error?.code : undefined,
        sqlState: process.env.NODE_ENV === "development" ? error?.sqlState : undefined,
        ...errorDetails,
      },
      { status: 500 }
    )
  }
}

// PUT update payment request (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: "Payment ID and status are required" },
        { status: 400 }
      )
    }

    await execute(
      `UPDATE payment_requests SET status = ? WHERE id = ?`,
      [status, id]
    )

    // Fetch updated payment
    const payment = await queryOne(
      `SELECT 
        p.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.shopName as user_shopName,
        u.contactNumber as user_contactNumber
       FROM payment_requests p
       LEFT JOIN users u ON p.userId = u.id
       WHERE p.id = ?`,
      [id]
    )

    // If approved, activate subscription
    if (status === "APPROVED") {
      const existing = await queryOne(
        `SELECT * FROM subscriptions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`,
        [payment.userId]
      )

      if (existing) {
        // Save to history
        await execute(
          `INSERT INTO subscription_history 
           (id, userId, tenantId, plan, status, startDate, endDate, price, paymentStatus, paymentId, isFreeTrial)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            existing.userId,
            payment.tenantId,
            existing.plan,
            existing.status,
            existing.startDate,
            existing.endDate,
            existing.price,
            existing.paymentStatus,
            existing.paymentId,
            existing.isFreeTrial,
          ]
        )
      }

      // Update or create subscription
      let subscriptionId: string
      if (existing) {
        await execute(
          `UPDATE subscriptions SET 
           plan = ?, status = 'ACTIVE', startDate = ?, endDate = ?, price = ?, 
           paymentStatus = 'APPROVED', paymentId = ?, isFreeTrial = FALSE
           WHERE id = ?`,
          [payment.plan, payment.startDate, payment.endDate, payment.price, id, existing.id]
        )
        subscriptionId = existing.id
      } else {
        subscriptionId = uuidv4()
        await execute(
          `INSERT INTO subscriptions 
           (id, userId, tenantId, plan, status, startDate, endDate, price, paymentStatus, paymentId, isFreeTrial)
           VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 'APPROVED', ?, FALSE)`,
          [subscriptionId, payment.userId, payment.tenantId, payment.plan, payment.startDate, payment.endDate, payment.price, id]
        )
      }

      // Send email to user about payment approval
      try {
        const subscription = await queryOne(
          `SELECT * FROM subscriptions WHERE id = ?`,
          [subscriptionId]
        )
        if (subscription && payment.user_id) {
          const user = {
            id: payment.user_id,
            name: payment.user_name,
            email: payment.user_email,
            shopName: payment.user_shopName,
            contactNumber: payment.user_contactNumber,
            role: "USER" as const,
            tenantId: payment.tenantId,
            createdAt: new Date().toISOString(),
          }
          // Send approval email to user (this serves as the final receipt)
          await sendPaymentApprovedEmail(user, subscription)
          // Send admin notification about subscription purchase
          await sendAdminSubscriptionPurchaseNotification(user, subscription)
        }
      } catch (emailError) {
        console.error("[API] Error sending payment approval emails:", emailError)
        // Don't fail payment approval if email fails
      }
    } else if (status === "REJECTED") {
      // Send email to user about payment rejection
      try {
        if (payment.user_id) {
          const user = {
            id: payment.user_id,
            name: payment.user_name,
            email: payment.user_email,
            shopName: payment.user_shopName,
            contactNumber: payment.user_contactNumber,
            role: "USER" as const,
            tenantId: payment.tenantId,
            createdAt: new Date().toISOString(),
          }
          await sendPaymentRejectedEmail(user, payment)
        }
      } catch (emailError) {
        console.error("[API] Error sending payment rejection email:", emailError)
        // Don't fail payment rejection if email fails
      }
    }

    const formatted = {
      ...payment,
      user: {
        id: payment.user_id,
        name: payment.user_name,
        email: payment.user_email,
        shopName: payment.user_shopName,
        contactNumber: payment.user_contactNumber,
      },
    }

    return NextResponse.json({ payment: formatted })
  } catch (error) {
    console.error("[API] Error updating payment request:", error)
    return NextResponse.json(
      { error: "Failed to update payment request" },
      { status: 500 }
    )
  }
}
