import type { Subscription, User } from "@/lib/constants"
import { PLAN_PRICING } from "@/lib/constants"
import { getSubscriptionEndDate, getDaysUntilExpiration } from "@/lib/subscription-utils"

const FROM_EMAIL = "bonusrepairdesk@gmail.com"
const ADMIN_EMAIL = "bonusrepairdesk@gmail.com"

/**
 * Send email via API
 */
async function sendEmail(to: string, subject: string, html: string, text?: string) {
  try {
    // If we're on the server side, try to directly import and use the email sending logic
    // Otherwise, use the API endpoint
    const isServerSide = typeof window === "undefined"
    
    if (isServerSide) {
      // Server-side: directly use nodemailer
      try {
        const nodemailerModule = await import("nodemailer")
        const nodemailer = nodemailerModule.default || nodemailerModule
        
        const GMAIL_APP_PASSWORD = "afwm ammi rlmg kclv"
        const transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: FROM_EMAIL,
            pass: GMAIL_APP_PASSWORD.replace(/\s/g, ""),
          },
        })
        
        const mailOptions: any = {
          from: `Bonus Repair Desk <${FROM_EMAIL}>`,
          to: to,
          subject: subject,
          html: html || text,
          text: text || html?.replace(/<[^>]*>/g, ""),
        }
        
        const info = await transporter.sendMail(mailOptions)
        console.log("[Email] Email sent successfully (server-side) to:", to, "MessageId:", info.messageId)
        return true
      } catch (directError: any) {
        console.error("[Email] Direct email send failed, falling back to API:", directError?.message || directError)
        // Fall through to API method
      }
    }
    
    // Client-side or fallback: use API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (typeof process !== "undefined" && process.env.VERCEL_URL 
                      ? `https://${process.env.VERCEL_URL}` 
                      : "http://localhost:3000")
    
    const emailUrl = `${baseUrl}/api/send-email`
    
    console.log("[Email] Sending email to:", to, "Subject:", subject, "URL:", emailUrl)
    
    const response = await fetch(emailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        from: FROM_EMAIL,
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Email] Failed to send email. Status:", response.status, "Error:", errorText)
      throw new Error(`Failed to send email: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log("[Email] Email sent successfully to:", to)
    return true
  } catch (error: any) {
    console.error("[Email] Error sending email to", to, ":", error?.message || error)
    return false
  }
}

/**
 * Send welcome email with credentials after signup
 */
export async function sendWelcomeEmail(user: User, password: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials-box { background: #fff; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .credential-item { margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 3px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .trial-info { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Your Admin Panel!</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <p>Congratulations! Your admin panel account has been successfully created.</p>
            
            <div class="credentials-box">
              <h3 style="margin-top: 0; color: #667eea;">Your Login Credentials:</h3>
              <div class="credential-item">
                <strong>Email:</strong> ${user.email}
              </div>
              <div class="credential-item">
                <strong>Password:</strong> ${password}
              </div>
            </div>
            
            <div class="trial-info">
              <p><strong>🎁 Special Offer:</strong> You have been granted a <strong>15-day FREE trial</strong>!</p>
              <p>Your trial period will end in 15 days. After that, you'll need to subscribe to continue accessing your admin panel.</p>
            </div>
            
            <p>You can now log in to your admin panel using the credentials above.</p>
            
            <p style="text-align: center;">
              <a href="${typeof window !== "undefined" ? window.location.origin : ""}/login" class="button">Login to Admin Panel</a>
            </p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Welcome to Your Admin Panel!

Dear ${user.name || "Valued Customer"},

Congratulations! Your admin panel account has been successfully created.

Your Login Credentials:
Email: ${user.email}
Password: ${password}

Special Offer: You have been granted a 15-day FREE trial!
Your trial period will end in 15 days. After that, you'll need to subscribe to continue accessing your admin panel.

You can now log in to your admin panel using the credentials above.

Login URL: ${typeof window !== "undefined" ? window.location.origin : ""}/login

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, "Welcome to Your Admin Panel - Login Credentials", html, text)
}

/**
 * Send subscription confirmation email after payment
 */
export async function sendSubscriptionConfirmationEmail(user: User, subscription: Subscription) {
  const planDetails = PLAN_PRICING[subscription.plan]
  const startDate = new Date(subscription.startDate).toLocaleDateString()
  // Use calculated end date for free trials to ensure accuracy
  const calculatedEndDate = getSubscriptionEndDate(subscription)
  const endDate = calculatedEndDate.toLocaleDateString()
  const price = planDetails?.price || 0

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .receipt-box { background: #fff; border: 2px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; font-weight: bold; font-size: 1.1em; }
          .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Subscription Confirmed!</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <p>Your subscription payment has been successfully processed and accepted!</p>
            
            <div class="receipt-box">
              <h3 style="margin-top: 0; color: #28a745;">Payment Receipt</h3>
              <div class="receipt-row">
                <span>Plan:</span>
                <span>${planDetails?.name || subscription.plan}</span>
              </div>
              <div class="receipt-row">
                <span>Duration:</span>
                <span>${planDetails?.months || 0} months</span>
              </div>
              <div class="receipt-row">
                <span>Start Date:</span>
                <span>${startDate}</span>
              </div>
              <div class="receipt-row">
                <span>End Date:</span>
                <span>${endDate}</span>
              </div>
              <div class="receipt-row">
                <span>Amount Paid:</span>
                <span>€${price.toFixed(2)}</span>
              </div>
            </div>
            
            <p>Your admin panel access has been activated. You can now log in and enjoy all the features!</p>
            
            <p style="text-align: center;">
              <a href="${typeof window !== "undefined" ? window.location.origin : ""}/login" class="button">Access Admin Panel</a>
            </p>
            
            <p>Thank you for your subscription!</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Subscription Confirmed!

Dear ${user.name || "Valued Customer"},

Your subscription payment has been successfully processed and accepted!

Payment Receipt:
Plan: ${planDetails?.name || subscription.plan}
Duration: ${planDetails?.months || 0} months
Start Date: ${startDate}
End Date: ${endDate}
Amount Paid: €${price.toFixed(2)}

Your admin panel access has been activated. You can now log in and enjoy all the features!

Login URL: ${typeof window !== "undefined" ? window.location.origin : ""}/login

Thank you for your subscription!

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, "Subscription Confirmed - Payment Receipt", html, text)
}

/**
 * Send 7 days left reminder email
 */
export async function send7DaysReminderEmail(user: User, subscription: Subscription) {
  // Use calculated end date for free trials to ensure accuracy
  const calculatedEndDate = getSubscriptionEndDate(subscription)
  const endDate = calculatedEndDate.toLocaleDateString()
  const planDetails = PLAN_PRICING[subscription.plan]

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #ffc107; color: #333; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ 7 Days Left!</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <div class="warning-box">
              <p><strong>Important Reminder:</strong> Your subscription will expire in <strong>7 days</strong> (${endDate}).</p>
            </div>
            
            <p>To continue enjoying uninterrupted access to your admin panel, please renew your subscription before it expires.</p>
            
            <p><strong>Current Plan:</strong> ${planDetails?.name || subscription.plan} (€${planDetails?.price || 0})</p>
            
            <p style="text-align: center;">
              <a href="${typeof window !== "undefined" ? window.location.origin : ""}/subscription" class="button">Renew Subscription Now</a>
            </p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
7 Days Left - Subscription Reminder

Dear ${user.name || "Valued Customer"},

Important Reminder: Your subscription will expire in 7 days (${endDate}).

To continue enjoying uninterrupted access to your admin panel, please renew your subscription before it expires.

Current Plan: ${planDetails?.name || subscription.plan} (€${planDetails?.price || 0})

Renew your subscription here: ${typeof window !== "undefined" ? window.location.origin : ""}/subscription

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, "7 Days Left - Subscription Reminder", html, text)
}

/**
 * Send free trial ending notification
 */
export async function sendFreeTrialEndingEmail(user: User, subscription: Subscription) {
  // Use calculated end date for free trials to ensure accuracy
  const calculatedEndDate = getSubscriptionEndDate(subscription)
  const endDate = calculatedEndDate.toLocaleDateString()
  const daysLeft = getDaysUntilExpiration(subscription)
  
  // Also send admin notification
  try {
    await sendAdminSubscriptionEndingNotification(user, subscription, daysLeft)
  } catch (error) {
    console.error("Error sending admin subscription ending notification:", error)
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Free Trial Ending Soon!</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <div class="warning-box">
              <p><strong>Important:</strong> Your <strong>15-day FREE trial</strong> will end on ${endDate} (${daysLeft} day(s) remaining).</p>
            </div>
            
            <p>To continue accessing your admin panel after the trial period, you'll need to subscribe to one of our plans.</p>
            
            <p>Don't lose access to your data and settings! Subscribe now to ensure uninterrupted service.</p>
            
            <p style="text-align: center;">
              <a href="${typeof window !== "undefined" ? window.location.origin : ""}/subscription" class="button">Subscribe Now</a>
            </p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Free Trial Ending Soon!

Dear ${user.name || "Valued Customer"},

Important: Your 15-day FREE trial will end on ${endDate} (${daysLeft} day(s) remaining).

To continue accessing your admin panel after the trial period, you'll need to subscribe to one of our plans.

Don't lose access to your data and settings! Subscribe now to ensure uninterrupted service.

Subscribe here: ${typeof window !== "undefined" ? window.location.origin : ""}/subscription

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, "Free Trial Ending Soon - Subscribe Now", html, text)
}

/**
 * Send payment approved email
 */
export async function sendPaymentApprovedEmail(user: User, subscription: Subscription) {
  const planDetails = PLAN_PRICING[subscription.plan]
  const startDate = new Date(subscription.startDate).toLocaleDateString()
  // Use calculated end date for free trials to ensure accuracy
  const calculatedEndDate = getSubscriptionEndDate(subscription)
  const endDate = calculatedEndDate.toLocaleDateString()
  const price = planDetails?.price || 0

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
          .receipt-box { background: #fff; border: 2px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; font-weight: bold; font-size: 1.1em; }
          .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Approved!</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <div class="success-box">
              <p><strong>Great news!</strong> Your payment has been approved by our team.</p>
            </div>
            
            <p>Your subscription is now active and you have full access to your admin panel.</p>
            
            <div class="receipt-box">
              <div style="text-align: center; border-bottom: 2px solid #28a745; padding-bottom: 15px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #28a745;">PAYMENT RECEIPT</h2>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Receipt #${subscription.paymentId ? subscription.paymentId.substring(0, 8).toUpperCase() : subscription.id.substring(0, 8).toUpperCase()}</p>
                <p style="margin: 5px 0; color: #28a745; font-weight: bold;">Status: APPROVED ✅</p>
              </div>
              <div class="receipt-row">
                <span>Plan:</span>
                <span>${planDetails?.name || subscription.plan}</span>
              </div>
              <div class="receipt-row">
                <span>Duration:</span>
                <span>${planDetails?.months || 0} months</span>
              </div>
              <div class="receipt-row">
                <span>Start Date:</span>
                <span>${startDate}</span>
              </div>
              <div class="receipt-row">
                <span>End Date:</span>
                <span>${endDate}</span>
              </div>
              <div class="receipt-row">
                <span>Payment Method:</span>
                <span>MBWay</span>
              </div>
              <div class="receipt-row" style="border-top: 2px solid #28a745; margin-top: 10px; padding-top: 10px;">
                <span style="font-size: 18px;">Amount Paid:</span>
                <span style="font-size: 20px; color: #28a745;">€${price.toFixed(2)}</span>
              </div>
            </div>
            
            <p style="text-align: center;">
              <a href="${typeof window !== "undefined" ? window.location.origin : ""}/dashboard" class="button">Access Admin Panel</a>
            </p>
            
            <p>Thank you for your subscription!</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Payment Approved!

Dear ${user.name || "Valued Customer"},

Great news! Your payment has been approved by our team.

Your subscription is now active and you have full access to your admin panel.

PAYMENT RECEIPT
Receipt #${subscription.paymentId ? subscription.paymentId.substring(0, 8).toUpperCase() : subscription.id.substring(0, 8).toUpperCase()}
Status: APPROVED ✅

Subscription Details:
Plan: ${planDetails?.name || subscription.plan}
Duration: ${planDetails?.months || 0} months
Start Date: ${startDate}
End Date: ${endDate}
Payment Method: MBWay
Amount Paid: €${price.toFixed(2)}

Access your admin panel: ${typeof window !== "undefined" ? window.location.origin : ""}/dashboard

Thank you for your subscription!

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, "Payment Approved - Subscription Activated", html, text)
}

/**
 * Send receipt email to user when they submit a payment request
 */
export async function sendPaymentReceiptEmail(user: User, payment: any) {
  const planDetails = PLAN_PRICING[payment.plan as keyof typeof PLAN_PRICING]
  const startDate = new Date(payment.startDate).toLocaleDateString()
  const endDate = new Date(payment.endDate).toLocaleDateString()
  const paymentDate = new Date(payment.createdAt || new Date()).toLocaleString()

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .receipt-box { background: #fff; border: 2px solid #667eea; padding: 25px; margin: 20px 0; border-radius: 5px; }
          .receipt-header { text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 15px; margin-bottom: 20px; }
          .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; font-weight: bold; font-size: 1.2em; color: #667eea; }
          .receipt-label { font-weight: bold; color: #6b7280; }
          .receipt-value { color: #111827; }
          .status-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧾 Payment Receipt</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <p>Thank you for your subscription payment! This is your payment receipt.</p>
            
            <div class="receipt-box">
              <div class="receipt-header">
                <h2 style="margin: 0; color: #667eea;">PAYMENT RECEIPT</h2>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Receipt #${payment.id.substring(0, 8).toUpperCase()}</p>
              </div>
              
              <div class="receipt-row">
                <span class="receipt-label">Payment Date:</span>
                <span class="receipt-value">${paymentDate}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Payment Method:</span>
                <span class="receipt-value">MBWay</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Plan:</span>
                <span class="receipt-value">${planDetails?.name || payment.planName || payment.plan}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Duration:</span>
                <span class="receipt-value">${payment.months || planDetails?.months || 0} months</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Subscription Start:</span>
                <span class="receipt-value">${startDate}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Subscription End:</span>
                <span class="receipt-value">${endDate}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Amount Paid:</span>
                <span class="receipt-value">€${(payment.price || 0).toFixed(2)}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Status:</span>
                <span class="receipt-value" style="color: #ffc107; font-weight: bold;">PENDING APPROVAL</span>
              </div>
            </div>
            
            <div class="status-box">
              <p><strong>Payment Status:</strong> Your payment has been submitted and is pending admin approval.</p>
              <p>Your admin panel will be activated within <strong>15 minutes</strong> after admin approval. You'll receive a confirmation email once your subscription is activated.</p>
            </div>
            
            <p style="text-align: center;">
              <a href="${typeof window !== "undefined" ? window.location.origin : ""}/subscription" class="button">View Subscription Status</a>
            </p>
            
            <p style="font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              <strong>Note:</strong> This is a payment receipt. Your subscription will be activated after admin approval. If you have any questions, please contact us at ${FROM_EMAIL}
            </p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Payment Receipt

Dear ${user.name || "Valued Customer"},

Thank you for your subscription payment! This is your payment receipt.

PAYMENT RECEIPT
Receipt #${payment.id.substring(0, 8).toUpperCase()}

Payment Date: ${paymentDate}
Payment Method: MBWay
Plan: ${planDetails?.name || payment.planName || payment.plan}
Duration: ${payment.months || planDetails?.months || 0} months
Subscription Start: ${startDate}
Subscription End: ${endDate}
Amount Paid: €${(payment.price || 0).toFixed(2)}
Status: PENDING APPROVAL

Payment Status: Your payment has been submitted and is pending admin approval.
Your admin panel will be activated within 15 minutes after admin approval. You'll receive a confirmation email once your subscription is activated.

View Subscription Status: ${typeof window !== "undefined" ? window.location.origin : ""}/subscription

Note: This is a payment receipt. Your subscription will be activated after admin approval. If you have any questions, please contact us at ${FROM_EMAIL}

Thank you for your business!

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, `Payment Receipt - ${planDetails?.name || payment.planName || payment.plan} - €${(payment.price || 0).toFixed(2)}`, html, text)
}

/**
 * Send payment rejected email
 */
export async function sendPaymentRejectedEmail(user: User, payment: any) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Payment Declined</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <div class="warning-box">
              <p><strong>Unfortunately, your payment has been declined.</strong></p>
              <p>Please review your payment details and try again, or contact our support team for assistance.</p>
            </div>
            
            <p><strong>Payment Details:</strong></p>
            <ul>
              <li>Plan: ${payment.plan}</li>
              <li>Amount: €${payment.price || 0}</li>
              <li>Date: ${new Date(payment.createdAt).toLocaleDateString()}</li>
            </ul>
            
            <p>If you believe this is an error or have any questions, please contact our Super Admin <strong>Dhani</strong> directly on WhatsApp:</p>
            
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1976d2;">📱 WhatsApp: <a href="https://wa.me/351920306889" style="color: #1976d2; text-decoration: none;">+351 920 306 889</a></p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">Click the number to start a WhatsApp conversation</p>
            </div>
            
            <p style="text-align: center;">
              <a href="${typeof window !== "undefined" ? window.location.origin : ""}/billing" class="button">Try Payment Again</a>
            </p>
            
            <p>We're here to help! Please reach out to Super Admin Dhani on WhatsApp if you need any assistance with your payment.</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Payment Declined

Dear ${user.name || "Valued Customer"},

Unfortunately, your payment has been declined.

Please review your payment details and try again, or contact our support team for assistance.

Payment Details:
Plan: ${payment.plan}
Amount: €${payment.price || 0}
Date: ${new Date(payment.createdAt).toLocaleDateString()}

If you believe this is an error or have any questions, please contact our Super Admin Dhani directly on WhatsApp:

📱 WhatsApp: +351 920 306 889
(Click the number to start a WhatsApp conversation)

Try payment again: ${typeof window !== "undefined" ? window.location.origin : ""}/billing

We're here to help! Please reach out to Super Admin Dhani on WhatsApp if you need any assistance with your payment.

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, "Payment Declined - Please Try Again", html, text)
}

/**
 * Send admin notification when a payment request is submitted (with approve/decline links)
 * Includes user email and password for admin reference
 */
export async function sendAdminPaymentRequestNotification(payment: any, user: User, userPassword?: string) {
  // Get base URL - use environment variable or default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  
  // Create secure token for approve/decline links
  // Use btoa for browser or Buffer for Node.js
  let token: string
  if (typeof Buffer !== 'undefined') {
    token = Buffer.from(`${payment.id}:${payment.userId}`).toString('base64')
  } else if (typeof btoa !== 'undefined') {
    token = btoa(`${payment.id}:${payment.userId}`)
  } else {
    // Fallback: simple encoding
    token = encodeURIComponent(`${payment.id}:${payment.userId}`)
  }
  const approveUrl = `${baseUrl}/api/payments/approve?paymentId=${payment.id}&token=${token}`
  const declineUrl = `${baseUrl}/api/payments/decline?paymentId=${payment.id}&token=${token}`
  const adminPanelUrl = `${baseUrl}/super-admin/payments`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
          .action-buttons { margin: 30px 0; text-align: center; }
          .button { display: inline-block; padding: 15px 30px; margin: 10px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; }
          .button-approve { background: #28a745; color: white; }
          .button-decline { background: #dc3545; color: white; }
          .button-panel { background: #6c757d; color: white; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 New Payment Request</h1>
          </div>
          <div class="content">
            <p>A user has submitted a payment request that requires your approval.</p>
            
            <div class="info-box" style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1976d2;">👤 User Information & Login Credentials:</h3>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${user.name || "N/A"}</span>
              </div>
              <div class="detail-row" style="background: #bbdefb; padding: 12px; border-radius: 5px; margin: 10px 0;">
                <span class="detail-label" style="font-size: 16px;">📧 Email (Login):</span>
                <span class="detail-value" style="font-weight: bold; color: #1976d2; font-size: 18px; font-family: monospace;">${user.email || "N/A"}</span>
              </div>
              ${userPassword ? `
              <div class="detail-row" style="background: #c8e6c9; padding: 12px; border-radius: 5px; margin: 10px 0;">
                <span class="detail-label" style="font-size: 16px;">🔑 Password:</span>
                <span class="detail-value" style="font-family: monospace; font-weight: bold; color: #2e7d32; font-size: 18px;">${userPassword}</span>
              </div>
              ` : `
              <div class="detail-row">
                <span class="detail-label">Password:</span>
                <span class="detail-value" style="color: #6b7280; font-style: italic;">(Password is securely stored - check user management panel for details)</span>
              </div>
              `}
              <div class="detail-row">
                <span class="detail-label">Shop/Company:</span>
                <span class="detail-value">${user.shopName || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Contact Number:</span>
                <span class="detail-value">${user.contactNumber || "N/A"}</span>
              </div>
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">Payment Details:</h3>
              <div class="detail-row">
                <span class="detail-label">Plan:</span>
                <span class="detail-value">${payment.planName || payment.plan || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Price:</span>
                <span class="detail-value">€${payment.price || 0}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${payment.months || 0} months</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${new Date(payment.startDate).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span class="detail-value">${new Date(payment.endDate).toLocaleDateString()}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Payment ID:</span>
                <span class="detail-value" style="font-family: monospace; font-size: 12px;">${payment.id}</span>
              </div>
            </div>
            
            <div class="warning" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p><strong>⚠️ IMPORTANT - Action Required:</strong></p>
              <p><strong>User has paid via MBWay</strong> for this subscription. Please verify the payment and approve or decline it.</p>
              <p>You can approve/decline directly from this email using the buttons below, or from the admin panel.</p>
            </div>
            
            <div class="action-buttons">
              <a href="${approveUrl}" class="button button-approve">✅ Approve Payment</a>
              <a href="${declineUrl}" class="button button-decline">❌ Decline Payment</a>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${adminPanelUrl}" class="button button-panel">View in Admin Panel</a>
            </p>
            
            <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
              <strong>Note:</strong> You can also manage this payment request from the admin panel. The links above provide quick access to approve or decline directly from this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
New Payment Request

A user has submitted a payment request that requires your approval.

User Information & Login Credentials:
- Name: ${user.name || "N/A"}
- 📧 Email (Login): ${user.email || "N/A"}
${userPassword ? `- 🔑 Password: ${userPassword}` : `- Password: (Password is securely stored - check user management panel for details)`}
- Shop/Company: ${user.shopName || "N/A"}
- Contact Number: ${user.contactNumber || "N/A"}

⚠️ IMPORTANT: User has paid via MBWay. Please verify payment and approve/decline from the links above or admin panel.

Payment Details:
- Plan: ${payment.planName || payment.plan || "N/A"}
- Price: €${payment.price || 0}
- Duration: ${payment.months || 0} months
- Start Date: ${new Date(payment.startDate).toLocaleDateString()}
- End Date: ${new Date(payment.endDate).toLocaleDateString()}
- Payment ID: ${payment.id}

Action Required: Please review the payment request and approve or decline it.

Quick Actions:
- Approve: ${approveUrl}
- Decline: ${declineUrl}
- Admin Panel: ${adminPanelUrl}

Note: You can also manage this payment request from the admin panel.
  `.trim()

  return sendEmail(ADMIN_EMAIL, `New Payment Request: ${user.name || user.email} - ${payment.planName || payment.plan} - €${payment.price}`, html, text)
}

/**
 * Send contact form confirmation email to user
 */
export async function sendContactFormConfirmationEmail(userEmail: string, userName: string, subject: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Message Received!</h1>
          </div>
          <div class="content">
            <p>Dear ${userName},</p>
            
            <p>Thank you for contacting Bonus Repair Desk!</p>
            
            <div class="info-box">
              <p><strong>We have received your message regarding:</strong> ${subject}</p>
              <p>Our team will review your inquiry and get back to you as soon as possible, typically within 24 hours.</p>
            </div>
            
            <p>If you have any urgent questions, please feel free to contact us directly:</p>
            <ul>
              <li>Email: <a href="mailto:bonusrepairdesk@gmail.com">bonusrepairdesk@gmail.com</a></li>
              <li>WhatsApp: <a href="https://wa.me/351920306889">+351 920 306 889</a></li>
            </ul>
            
            <p>We appreciate your interest in Bonus Repair Desk and look forward to assisting you!</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Message Received!

Dear ${userName},

Thank you for contacting Bonus Repair Desk!

We have received your message regarding: ${subject}

Our team will review your inquiry and get back to you as soon as possible, typically within 24 hours.

If you have any urgent questions, please feel free to contact us directly:
- Email: bonusrepairdesk@gmail.com
- WhatsApp: +351 920 306 889

We appreciate your interest in Bonus Repair Desk and look forward to assisting you!

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(userEmail, "Thank You for Contacting Bonus Repair Desk", html, text)
}

/**
 * Send admin notification when a new user signs up
 */
export async function sendAdminSignupNotification(user: User, password: string, selectedPlan?: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New User Signup!</h1>
          </div>
          <div class="content">
            <p>A new user has just signed up for the admin panel.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">User Information:</h3>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${user.name || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email (Login):</span>
                <span class="detail-value" style="font-weight: bold; color: #059669;">${user.email || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Password:</span>
                <span class="detail-value" style="font-family: monospace; font-weight: bold; color: #059669;">${password || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shop/Company Name:</span>
                <span class="detail-value">${user.shopName || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Contact Number:</span>
                <span class="detail-value">${user.contactNumber || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Selected Plan:</span>
                <span class="detail-value">${selectedPlan ? PLAN_PRICING[selectedPlan as keyof typeof PLAN_PRICING]?.name || selectedPlan : "MONTHLY"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Signup Date:</span>
                <span class="detail-value">${new Date(user.createdAt || new Date()).toLocaleString()}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">User ID:</span>
                <span class="detail-value" style="font-family: monospace; font-size: 12px;">${user.id}</span>
              </div>
            </div>
            
            <p><strong>Note:</strong> This user has been granted a 15-day FREE trial. They will need to subscribe after the trial period ends.</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
New User Signup!

A new user has just signed up for the admin panel.

User Information:
- Name: ${user.name || "N/A"}
- Email (Login): ${user.email || "N/A"}
- Password: ${password || "N/A"}
- Shop/Company Name: ${user.shopName || "N/A"}
- Contact Number: ${user.contactNumber || "N/A"}
- Selected Plan: ${selectedPlan ? PLAN_PRICING[selectedPlan as keyof typeof PLAN_PRICING]?.name || selectedPlan : "MONTHLY"}
- Signup Date: ${new Date(user.createdAt || new Date()).toLocaleString()}
- User ID: ${user.id}

Note: This user has been granted a 15-day FREE trial. They will need to subscribe after the trial period ends.
  `.trim()

  return sendEmail(ADMIN_EMAIL, `New User Signup: ${user.name || user.email}`, html, text)
}

/**
 * Send login confirmation email to user
 */
export async function sendLoginEmail(user: User) {
  const loginTime = new Date().toLocaleString()
  const ipAddress = "Your device" // Could be passed from API if needed

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .security-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Login Successful</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <div class="info-box">
              <p><strong>You have successfully logged in to your admin panel.</strong></p>
              <p><strong>Login Time:</strong> ${loginTime}</p>
            </div>
            
            <p>If this was you, you can safely ignore this email.</p>
            
            <div class="security-box">
              <p><strong>⚠️ Security Notice:</strong></p>
              <p>If you did not log in to your account, please:</p>
              <ul>
                <li>Change your password immediately</li>
                <li>Contact our support team at ${FROM_EMAIL}</li>
                <li>Review your account activity</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard" class="button">Go to Dashboard</a>
            </p>
            
            <p>Thank you for using our admin panel!</p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Login Successful

Dear ${user.name || "Valued Customer"},

You have successfully logged in to your admin panel.

Login Time: ${loginTime}

If this was you, you can safely ignore this email.

Security Notice:
If you did not log in to your account, please:
- Change your password immediately
- Contact our support team at ${FROM_EMAIL}
- Review your account activity

Go to Dashboard: ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard

Thank you for using our admin panel!

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, "Login Successful - Admin Panel", html, text)
}

/**
 * Send admin notification when a user logs in
 */
export async function sendAdminLoginNotification(user: User) {
  const loginTime = new Date().toLocaleString()

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 User Logged In</h1>
          </div>
          <div class="content">
            <p>A user has logged in to the admin panel.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">User Information:</h3>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${user.name || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${user.email || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shop/Company Name:</span>
                <span class="detail-value">${user.shopName || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Contact Number:</span>
                <span class="detail-value">${user.contactNumber || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Login Time:</span>
                <span class="detail-value">${loginTime}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">User ID:</span>
                <span class="detail-value" style="font-family: monospace; font-size: 12px;">${user.id}</span>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
User Logged In

A user has logged in to the admin panel.

User Information:
- Name: ${user.name || "N/A"}
- Email: ${user.email || "N/A"}
- Shop/Company Name: ${user.shopName || "N/A"}
- Contact Number: ${user.contactNumber || "N/A"}
- Login Time: ${loginTime}
- User ID: ${user.id}
  `.trim()

  return sendEmail(ADMIN_EMAIL, `User Logged In: ${user.name || user.email}`, html, text)
}

/**
 * Send logout confirmation email to user
 */
export async function sendLogoutEmail(user: User) {
  const logoutTime = new Date().toLocaleString()

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 Logout Successful</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name || "Valued Customer"},</p>
            
            <div class="info-box">
              <p><strong>You have successfully logged out of your admin panel.</strong></p>
              <p><strong>Logout Time:</strong> ${logoutTime}</p>
            </div>
            
            <p>Your session has been securely ended. Thank you for using our admin panel!</p>
            
            <p>If you need to log in again, you can use the button below:</p>
            
            <p style="text-align: center;">
              <a href="${typeof window !== "undefined" ? window.location.origin : ""}/login" class="button">Log In Again</a>
            </p>
            
            <p>Best regards,<br><strong>Bonus Repair Desk Team</strong><br>${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Logout Successful

Dear ${user.name || "Valued Customer"},

You have successfully logged out of your admin panel.

Logout Time: ${logoutTime}

Your session has been securely ended. Thank you for using our admin panel!

If you need to log in again, visit: ${typeof window !== "undefined" ? window.location.origin : ""}/login

Best regards,
Bonus Repair Desk Team
${FROM_EMAIL}
  `.trim()

  return sendEmail(user.email, "Logout Successful - Admin Panel", html, text)
}

/**
 * Send admin notification when a user logs out
 */
export async function sendAdminLogoutNotification(user: User) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 User Logged Out</h1>
          </div>
          <div class="content">
            <p>A user has logged out of the admin panel.</p>
            
            <div class="info-box">
              <p><strong>User:</strong> ${user.name || "N/A"}</p>
              <p><strong>Email:</strong> ${user.email || "N/A"}</p>
              <p><strong>Shop/Company:</strong> ${user.shopName || "N/A"}</p>
              <p><strong>Logout Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
User Logged Out

A user has logged out of the admin panel.

User: ${user.name || "N/A"}
Email: ${user.email || "N/A"}
Shop/Company: ${user.shopName || "N/A"}
Logout Time: ${new Date().toLocaleString()}
  `.trim()

  return sendEmail(ADMIN_EMAIL, `User Logged Out: ${user.name || user.email}`, html, text)
}

/**
 * Send admin notification when a user purchases a subscription
 */
export async function sendAdminSubscriptionPurchaseNotification(user: User, subscription: Subscription) {
  const planDetails = PLAN_PRICING[subscription.plan]
  const calculatedEndDate = getSubscriptionEndDate(subscription)
  const startDate = new Date(subscription.startDate).toLocaleDateString()
  const endDate = calculatedEndDate.toLocaleDateString()

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 New Subscription Purchase!</h1>
          </div>
          <div class="content">
            <p>A user has purchased a subscription.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">User Information:</h3>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${user.name || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${user.email || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shop/Company:</span>
                <span class="detail-value">${user.shopName || "N/A"}</span>
              </div>
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">Subscription Details:</h3>
              <div class="detail-row">
                <span class="detail-label">Plan:</span>
                <span class="detail-value">${planDetails?.name || subscription.plan}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Price:</span>
                <span class="detail-value">€${planDetails?.price || subscription.price || 0}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${planDetails?.months || 0} months</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${startDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span class="detail-value">${endDate}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${subscription.status || "ACTIVE"}</span>
              </div>
            </div>
            
            <p><strong>Purchase Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
New Subscription Purchase!

A user has purchased a subscription.

User Information:
- Name: ${user.name || "N/A"}
- Email: ${user.email || "N/A"}
- Shop/Company: ${user.shopName || "N/A"}

Subscription Details:
- Plan: ${planDetails?.name || subscription.plan}
- Price: €${planDetails?.price || subscription.price || 0}
- Duration: ${planDetails?.months || 0} months
- Start Date: ${startDate}
- End Date: ${endDate}
- Status: ${subscription.status || "ACTIVE"}

Purchase Time: ${new Date().toLocaleString()}
  `.trim()

  return sendEmail(ADMIN_EMAIL, `New Subscription Purchase: ${user.name || user.email} - ${planDetails?.name || subscription.plan}`, html, text)
}

/**
 * Send admin notification when a subscription is ending
 */
export async function sendAdminSubscriptionEndingNotification(user: User, subscription: Subscription, daysLeft: number) {
  const planDetails = PLAN_PRICING[subscription.plan]
  const calculatedEndDate = getSubscriptionEndDate(subscription)
  const endDate = calculatedEndDate.toLocaleDateString()
  const isTrial = subscription.isFreeTrial || subscription.status === "free_trial" || subscription.status === "FREE_TRIAL"

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Subscription Ending Soon!</h1>
          </div>
          <div class="content">
            <p>A user's subscription is ending soon.</p>
            
            <div class="warning-box">
              <h3 style="margin-top: 0; color: #dc2626;">${isTrial ? "Free Trial" : "Subscription"} Ending in ${daysLeft} day(s)</h3>
              <p><strong>User:</strong> ${user.name || "N/A"} (${user.email || "N/A"})</p>
              <p><strong>Shop/Company:</strong> ${user.shopName || "N/A"}</p>
              <p><strong>Plan:</strong> ${planDetails?.name || subscription.plan}</p>
              <p><strong>End Date:</strong> ${endDate}</p>
              ${isTrial ? '<p style="color: #dc2626; font-weight: bold;">⚠️ This is a FREE TRIAL that is ending!</p>' : ''}
            </div>
            
            <p><strong>Action Required:</strong> The user will lose access to their admin panel after the subscription ends. They should be notified to renew their subscription.</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Subscription Ending Soon!

A user's subscription is ending soon.

${isTrial ? "Free Trial" : "Subscription"} Ending in ${daysLeft} day(s)

User: ${user.name || "N/A"} (${user.email || "N/A"})
Shop/Company: ${user.shopName || "N/A"}
Plan: ${planDetails?.name || subscription.plan}
End Date: ${endDate}
${isTrial ? "⚠️ This is a FREE TRIAL that is ending!" : ""}

Action Required: The user will lose access to their admin panel after the subscription ends. They should be notified to renew their subscription.
  `.trim()

  return sendEmail(ADMIN_EMAIL, `Subscription Ending: ${user.name || user.email} - ${daysLeft} day(s) left`, html, text)
}
