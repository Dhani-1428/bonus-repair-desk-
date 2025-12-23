import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, execute } from "@/lib/mysql"
import { v4 as uuidv4 } from "uuid"
import { sendAdminSubscriptionPurchaseNotification, sendAdminPaymentRequestNotification, sendPaymentApprovedEmail, sendPaymentRejectedEmail, sendPaymentReceiptEmail } from "@/lib/email-service"

// GET all payment requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

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
  } catch (error) {
    console.error("[API] Error fetching payment requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment requests" },
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

    if (!userId || !plan || !planName || !price || !months || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    const paymentId = uuidv4()

    await execute(
      `INSERT INTO payment_requests 
       (id, userId, tenantId, plan, planName, price, months, startDate, endDate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [paymentId, userId, user.tenantId, plan, planName, parseFloat(price), parseInt(months), startDate, endDate]
    )

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
      const userForReceipt = {
        id: payment.user_id,
        name: payment.user_name,
        email: payment.user_email,
        shopName: payment.user_shopName,
        contactNumber: payment.user_contactNumber,
        role: "USER" as const,
        tenantId: payment.tenantId,
        createdAt: new Date().toISOString(),
      }
      await sendPaymentReceiptEmail(userForReceipt, formatted)
    } catch (emailError) {
      console.error("[API] Error sending payment receipt email:", emailError)
      // Don't fail payment creation if email fails
    }

    // Send admin notification about new payment request
    try {
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
      console.log("[API] Sending admin payment request notification to bonusrepairdesk@gmail.com for payment:", formatted.id)
      const emailSent = await sendAdminPaymentRequestNotification(formatted, user)
      if (emailSent) {
        console.log("[API] ✅ Admin payment request notification sent successfully")
      } else {
        console.error("[API] ⚠️  Admin payment request notification returned false - email may not have been sent")
      }
    } catch (emailError: any) {
      console.error("[API] ❌ Error sending admin payment request notification:", emailError?.message || emailError)
      console.error("[API] Error details:", {
        message: emailError?.message,
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
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      stack: error?.stack?.substring(0, 500),
    })
    return NextResponse.json(
      { 
        error: "Failed to create payment request",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
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
