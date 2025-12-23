"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useTranslation } from "@/components/language-provider"
import { useAuth } from "@/hooks/use-auth"
import { scheduleSubscriptionChecks } from "@/lib/subscription-notifications"
import { AlertCircle, CheckCircle, Clock, X } from "lucide-react"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, logout, loading, subscription, updateSubscription } = useAuth()
  const { language, setLanguage, t } = useTranslation()
  const [showPaymentBanner, setShowPaymentBanner] = useState(true)

  // Check if payment notification has been dismissed
  useEffect(() => {
    if (!user?.id || !subscription) return
    
    // Create unique key for this payment notification
    const notificationKey = `payment_notification_dismissed_${user.id}_${subscription.id}_${subscription.paymentStatus}`
    
    // Check if this specific notification was dismissed
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(notificationKey)
      if (dismissed) {
        setShowPaymentBanner(false)
      } else {
        setShowPaymentBanner(true)
      }
    }
  }, [user?.id, subscription?.id, subscription?.paymentStatus])

  // Function to dismiss payment notification permanently
  const dismissPaymentNotification = () => {
    if (!user?.id || !subscription) return
    
    const notificationKey = `payment_notification_dismissed_${user.id}_${subscription.id}_${subscription.paymentStatus}`
    
    // Mark as dismissed in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(notificationKey, new Date().toISOString())
      setShowPaymentBanner(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    // Check subscription status for non-super-admin users (only if not already on subscription or pricing page)
    if (user && user.role !== "super_admin" && user.role !== "SUPER_ADMIN" && typeof window !== "undefined") {
      const currentPath = window.location.pathname
      // Don't redirect if already on subscription, pricing, billing, or login page
      if (currentPath === "/subscription" || currentPath === "/pricing" || currentPath === "/billing" || currentPath.startsWith("/billing/") || currentPath === "/login" || currentPath === "/register") {
        return
      }

      // Check subscription from API
      const checkSubscription = async () => {
        try {
          const response = await fetch(`/api/subscriptions?userId=${user.id}`)
          if (!response.ok) {
            // If API fails, allow access (don't block users)
            return
          }
          
          const data = await response.json()
          const subscription = data.subscription
          
          if (!subscription) {
            // No subscription found, redirect to subscription page
            router.push("/subscription")
            return
          }

          const endDate = new Date(subscription.endDate)
          const today = new Date()
          const isExpired = endDate < today
          const isFreeTrial = subscription.status === "FREE_TRIAL" || subscription.status === "free_trial" || subscription.isFreeTrial
          const paymentStatus = subscription.paymentStatus || "PENDING"
          const isPaymentApproved = paymentStatus === "APPROVED"
          
          // Block access if subscription is expired
          if (isExpired) {
            router.push("/subscription")
            return
          }
          
          // Block access if payment is not approved (unless it's a free trial)
          if (!isFreeTrial && !isPaymentApproved) {
            router.push("/subscription")
            return
          }
        } catch (error) {
          console.error("[DashboardLayout] Error checking subscription:", error)
          // On error, don't block access - allow user to continue
        }
      }
      
      checkSubscription()
    }
  }, [user, loading, router])

  // Calculate isSuperAdmin early so it can be used in useEffect
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "SUPER_ADMIN" || user?.email === "superadmin@admin.com"

  useEffect(() => {
    // Initialize subscription notification checks when user is logged in
    if (user && !loading) {
      scheduleSubscriptionChecks()
      
      // Reload subscription to get latest payment status
      const loadSubscription = async () => {
        if (!user.id || isSuperAdmin) return
        try {
          const response = await fetch(`/api/subscriptions?userId=${user.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.subscription) {
              // Update subscription in sessionStorage and state
              sessionStorage.setItem("subscription", JSON.stringify(data.subscription))
              updateSubscription(data.subscription)
            }
          }
        } catch (error) {
          console.error("Error loading subscription:", error)
        }
      }
      
      loadSubscription()
      
      // Listen for subscription update events (when super admin approves/rejects)
      const handleSubscriptionUpdate = () => {
        loadSubscription()
      }
      
      window.addEventListener("subscriptionUpdated", handleSubscriptionUpdate)
      
      // Also poll every 10 seconds for updates
      const interval = setInterval(loadSubscription, 10000)
      
      return () => {
        window.removeEventListener("subscriptionUpdated", handleSubscriptionUpdate)
        clearInterval(interval)
      }
    }
  }, [user, loading, isSuperAdmin])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const shopName = user.shopName || user.name || "Admin Panel"

  return (
    <div className="min-h-screen w-full relative bg-black">
      {/* Pearl Mist Background with Top Glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(226, 232, 240, 0.12), transparent 60%), #000000",
        }}
      />
      
      {/* Header */}
      <header className="sticky top-2 z-[9999] mx-auto w-full flex-row items-center justify-between self-start rounded-full bg-gradient-to-r from-gray-900/90 via-black/90 to-gray-900/90 backdrop-blur-md border border-gray-800/50 shadow-2xl transition-all duration-300 max-w-7xl px-4 py-2 mt-2"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          perspective: "1000px",
        }}
      >
        <div className="w-full flex items-center justify-between">
          <Link href={isSuperAdmin ? "/super-admin" : "/dashboard"} className="z-50 flex items-center justify-center gap-3 transition-all duration-300 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-blue-600 to-purple-700 p-2.5 rounded-xl shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-bold text-lg tracking-tight group-hover:text-blue-300 transition-colors duration-300">
                {shopName}
              </span>
              {isSuperAdmin && (
                <span className="text-xs text-gray-400 font-medium">Super Admin</span>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-300 flex items-center gap-2 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span>{t("header.language")}:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "pt")}
                  className="border border-gray-700 rounded-lg text-sm px-3 py-1.5 bg-gray-900 text-white hover:border-gray-600 focus:border-gray-600 focus:ring-2 focus:ring-gray-700 transition-all font-medium"
                >
                  <option value="en">{t("header.english")}</option>
                  <option value="pt">{t("header.portuguese")}</option>
                </select>
              </label>
            </div>
            <div className="h-8 w-px bg-gray-700"></div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-gray-700 group-hover:ring-blue-500 transition-all duration-300">
                  <span className="text-white font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize font-medium">{user?.role || "member"}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="border-gray-700 bg-gray-900 text-white hover:bg-red-600 hover:border-red-500 font-medium transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 transform hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t("header.logout")}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex relative z-10 mt-4">
        {/* Sidebar */}
        <aside className="w-72 bg-gradient-to-b from-gray-900/95 via-black/95 to-black border-r border-gray-800/50 min-h-[calc(100vh-140px)] p-6 shadow-2xl backdrop-blur-sm">
          <nav className="space-y-2 animate-fade-in">
            {(user?.role === "super_admin" || user?.role === "SUPER_ADMIN" || user?.email === "superadmin@admin.com") ? (
              <>
                <div className="pt-2 mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                    <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></span>
                    Super Admin
                  </p>
                </div>
                <Link href="/super-admin">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <span className="relative">Dashboard</span>
                  </Button>
                </Link>
                <Link href="/super-admin/users">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <span className="relative">Users Information</span>
                  </Button>
                </Link>
                <Link href="/super-admin/subscriptions">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <span className="relative">Subscriptions</span>
                  </Button>
                </Link>
                <Link href="/super-admin/payments">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="relative">Payment Approvals</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                    </div>
                    <span className="relative">{t("header.dashboard")}</span>
                  </Button>
                </Link>
                <Link href="/tickets/new">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="relative">{t("header.newDevice")}</span>
                  </Button>
                </Link>
                <Link href="/tickets">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <span className="relative">{t("header.allDevices")}</span>
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <span className="relative">Analytics</span>
                  </Button>
                </Link>
                <Link href="/subscription">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                    </div>
                    <span className="relative">Subscription</span>
                  </Button>
                </Link>
                <div className="pt-4 mt-4 border-t border-gray-800">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                    <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></span>
                    Administration
                  </p>
                </div>
                <Link href="/trash">
                  <Button variant="ghost" className="w-full justify-start hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:text-white text-gray-300 font-medium h-12 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                    <div className="relative w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mr-3 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </div>
                    <span className="relative">{t("header.trash")}</span>
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </aside>

        {/* Payment Status Banner */}
        {!isSuperAdmin && subscription && subscription.paymentStatus && showPaymentBanner && (
          <div className="flex-1 px-8 pt-8 pb-0">
            <div className="container mx-auto max-w-7xl">
              {subscription.paymentStatus === "REJECTED" || subscription.paymentStatus === "rejected" ? (
                <div className="bg-gradient-to-r from-red-600/20 to-red-800/20 border-2 border-red-500/50 rounded-lg p-4 mb-4 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <X className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">Your payment is declined</p>
                      <p className="text-red-300 text-sm">Please contact support or try a different payment method.</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissPaymentNotification}
                    className="text-red-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ) : subscription.paymentStatus === "APPROVED" || subscription.paymentStatus === "approved" ? (
                subscription.status === "ACTIVE" || subscription.status === "active" ? (
                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-800/20 border-2 border-green-500/50 rounded-lg p-4 mb-4 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">Your payment is successful</p>
                        <p className="text-green-300 text-sm">Your subscription is now active. Thank you!</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={dismissPaymentNotification}
                      className="text-green-300 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                ) : null
              ) : subscription.paymentStatus === "PENDING" || subscription.paymentStatus === "pending" ? (
                <div className="bg-gradient-to-r from-yellow-600/20 to-orange-800/20 border-2 border-yellow-500/50 rounded-lg p-4 mb-4 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">Your payment is in process</p>
                      <p className="text-yellow-300 text-sm">Your payment is being reviewed. You'll be notified once it's approved.</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissPaymentNotification}
                    className="text-yellow-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-8 text-white relative z-10">
          <div className="container mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}

