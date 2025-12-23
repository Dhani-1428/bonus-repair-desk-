"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { isSuperAdmin } from "@/lib/storage"
import { PLAN_PRICING } from "@/lib/constants"
import { toast } from "sonner"
import Link from "next/link"
import { CheckCircle, XCircle, Clock, DollarSign } from "lucide-react"
// Email sending is now handled by the API endpoints

interface PaymentRequest {
  id: string
  userId: string
  user?: {
    id: string
    name: string
    email: string
    shopName?: string
    contactNumber?: string
  }
  userName?: string
  userEmail?: string
  plan: string
  planName: string
  price: number
  months: number
  startDate: string
  endDate: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected"
  createdAt: string
}

export default function PaymentsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (user.role !== "SUPER_ADMIN" && user.role !== "super_admin" && user.email !== "superadmin@admin.com") {
      router.push("/dashboard")
      return
    }

    loadPaymentRequests()
    
    // Check for URL parameters (from email approve/decline links)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const message = urlParams.get("message")
      const error = urlParams.get("error")
      
      if (message) {
        toast.success(message)
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname)
        // Reload payment requests to show updated status
        setTimeout(() => loadPaymentRequests(), 1000)
      }
      if (error) {
        toast.error(error)
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
    
    // Refresh every 30 seconds to check for new payments
    const interval = setInterval(loadPaymentRequests, 30000)
    return () => clearInterval(interval)
  }, [user, loading, router])

  const loadPaymentRequests = async () => {
    try {
      const response = await fetch("/api/payments")
      if (!response.ok) {
        console.error("[Payments] Failed to fetch payments:", response.status)
        toast.error("Failed to load payment requests")
        return
      }
      const data = await response.json()
      const payments = (data.payments || []).map((p: any) => ({
        ...p,
        userName: p.user?.name || p.userName || "Unknown",
        userEmail: p.user?.email || p.userEmail || "Unknown",
      }))
      setPaymentRequests(payments.sort((a: PaymentRequest, b: PaymentRequest) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    } catch (error) {
      console.error("[Payments] Error loading payment requests:", error)
      toast.error("Failed to load payment requests")
    }
  }

  const handleApprovePayment = async (payment: PaymentRequest) => {
    try {
      // Call API to approve payment (this will also activate subscription and send emails)
      const response = await fetch("/api/payments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: payment.id,
          status: "APPROVED",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to approve payment")
      }

      const data = await response.json()
      
      // Emails are sent automatically by the API
      toast.success(`Payment approved! User ${payment.userName || payment.user?.name || "Unknown"} can now access their admin panel. Email with receipt has been sent to the user.`)
      
      // Reload payment requests to show updated status
      await loadPaymentRequests()
    } catch (error: any) {
      console.error("Error approving payment:", error)
      toast.error(error.message || "Failed to approve payment. Please try again.")
    }
  }

  const handleRejectPayment = async (payment: PaymentRequest) => {
    try {
      // Call API to reject payment (this will also send rejection email with WhatsApp contact)
      const response = await fetch("/api/payments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: payment.id,
          status: "REJECTED",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to reject payment")
      }

      const data = await response.json()
      
      // Email is sent automatically by the API with WhatsApp contact info
      toast.success(`Payment rejected for ${payment.userName || payment.user?.name || "Unknown"}. Email with WhatsApp contact has been sent to the user.`)
      
      // Reload payment requests to show updated status
      await loadPaymentRequests()
    } catch (error: any) {
      console.error("Error rejecting payment:", error)
      toast.error(error.message || "Failed to reject payment. Please try again.")
    }
  }

  const filteredPayments = paymentRequests.filter((payment) => {
    if (filter === "all") return true
    const status = payment.status.toUpperCase()
    if (filter === "pending") return status === "PENDING"
    if (filter === "approved") return status === "APPROVED"
    if (filter === "rejected") return status === "REJECTED"
    return false
  })

  const pendingCount = paymentRequests.filter((p) => p.status.toUpperCase() === "PENDING").length

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin()) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Payment Approvals</h1>
            <p className="text-gray-300">Review and approve subscription payments</p>
          </div>
          <Link href="/super-admin">
            <Button variant="outline" className="border-gray-700 bg-gray-900/50 text-white hover:bg-gray-800">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-blue-600 text-white" : "border-gray-700 bg-gray-900/50 text-white"}
          >
            All ({paymentRequests.length})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
            className={filter === "pending" ? "bg-yellow-600 text-white" : "border-gray-700 bg-gray-900/50 text-white"}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "outline"}
            onClick={() => setFilter("approved")}
            className={filter === "approved" ? "bg-green-600 text-white" : "border-gray-700 bg-gray-900/50 text-white"}
          >
            Approved ({paymentRequests.filter((p) => p.status.toUpperCase() === "APPROVED").length})
          </Button>
          <Button
            variant={filter === "rejected" ? "default" : "outline"}
            onClick={() => setFilter("rejected")}
            className={filter === "rejected" ? "bg-red-600 text-white" : "border-gray-700 bg-gray-900/50 text-white"}
          >
            Rejected ({paymentRequests.filter((p) => p.status.toUpperCase() === "REJECTED").length})
          </Button>
        </div>

        {/* Payment Requests List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No payment requests found</p>
              </CardContent>
            </Card>
          ) : (
            filteredPayments.map((payment) => (
              <Card
                key={payment.id}
                className={`shadow-2xl border-2 ${
                  payment.status.toUpperCase() === "PENDING"
                    ? "border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 via-black/95 to-yellow-900/20"
                    : payment.status.toUpperCase() === "APPROVED"
                    ? "border-green-500/50 bg-gradient-to-br from-green-900/20 via-black/95 to-green-900/20"
                    : "border-red-500/50 bg-gradient-to-br from-red-900/20 via-black/95 to-red-900/20"
                } backdrop-blur-sm`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {payment.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white">{payment.userName || payment.user?.name || "Unknown"}</h3>
                          <p className="text-sm text-gray-400">{payment.userEmail || payment.user?.email || "Unknown"}</p>
                        </div>
                        <Badge
                          className={
                            payment.status.toUpperCase() === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                              : payment.status.toUpperCase() === "APPROVED"
                              ? "bg-green-500/20 text-green-400 border-green-500/50"
                              : "bg-red-500/20 text-red-400 border-red-500/50"
                          }
                        >
                          {payment.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-400">Plan</p>
                          <p className="text-sm font-semibold text-white">{payment.planName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Amount</p>
                          <p className="text-sm font-semibold text-white">€{payment.price}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Duration</p>
                          <p className="text-sm font-semibold text-white">{payment.months} month{payment.months > 1 ? "s" : ""}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Submitted</p>
                          <p className="text-sm font-semibold text-white">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400">
                        Payment ID: {payment.id}
                      </div>
                    </div>

                    {payment.status.toUpperCase() === "PENDING" && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleApprovePayment(payment)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectPayment(payment)}
                          variant="outline"
                          className="border-red-600 bg-red-900/20 text-red-400 hover:bg-red-900/40"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

