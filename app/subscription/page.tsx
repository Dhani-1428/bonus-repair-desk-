"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/components/language-provider"
import { PLAN_PRICING, type SubscriptionPlan } from "@/lib/constants"
import { isExpired, isExpiringSoon, getDaysUntilExpiration, isNotStarted, getSubscriptionEndDate } from "@/lib/subscription-utils"
import { toast } from "sonner"
import { Check, AlertCircle, Calendar, Mail, Clock } from "lucide-react"
import { scheduleSubscriptionChecks } from "@/lib/subscription-notifications"

export default function SubscriptionPage() {
  const router = useRouter()
  const { user, subscription, updateSubscription } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([])

  useEffect(() => {
    // Initialize subscription notification checks
    scheduleSubscriptionChecks()
    
    // Load subscription history
    if (user?.id) {
      const history = JSON.parse(localStorage.getItem(`subscription_history_${user.id}`) || "[]")
      setSubscriptionHistory(history)
    }
  }, [user])

  // Auto-refresh subscription status every 5 seconds to catch payment status changes
  useEffect(() => {
    if (!user?.id) return

    const refreshSubscription = async () => {
      try {
        const response = await fetch(`/api/subscriptions?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.subscription) {
            // Update subscription in sessionStorage and trigger update
            sessionStorage.setItem("subscription", JSON.stringify(data.subscription))
            updateSubscription(data.subscription)
            
            // Reload history
            const history = JSON.parse(localStorage.getItem(`subscription_history_${user.id}`) || "[]")
            setSubscriptionHistory(history)
          }
        }
      } catch (error) {
        console.error("Error refreshing subscription:", error)
      }
    }

    // Refresh immediately
    refreshSubscription()
    
    // Then refresh every 5 seconds
    const interval = setInterval(refreshSubscription, 5000)
    
    return () => clearInterval(interval)
  }, [user?.id, updateSubscription])

  // Allow access to subscription page even if subscription is expired
  // This page is accessible to allow users to renew

  const plans = [
    {
      id: "SIX_MONTH" as SubscriptionPlan,
      name: t("plan.professional"),
      price: 100,
      period: "6 months",
      popular: true,
    },
    {
      id: "TWELVE_MONTH" as SubscriptionPlan,
      name: t("plan.enterprise"),
      price: 150,
      period: "12 months",
      popular: false,
    },
  ]

  const handleRenew = async (plan: SubscriptionPlan) => {
    // Redirect to billing page for payment
    router.push("/billing")
  }

  const getSubscriptionStatus = () => {
    if (!subscription) return { status: "none", message: t("subscription.noActive"), color: "gray" }
    if (subscription.status === "free_trial" || subscription.isFreeTrial || subscription.status === "FREE_TRIAL") {
      const days = getDaysUntilExpiration(subscription)
      return { status: "free_trial", message: t("subscription.freePlanDaysLeft").replace("{days}", days.toString()), color: "blue" }
    }
    if (subscription.status === "pending" || subscription.status === "PENDING") {
      return { status: "pending", message: t("subscription.paymentPending"), color: "yellow" }
    }
    // Check if subscription hasn't started yet
    if (isNotStarted(subscription)) {
      return { status: "not_started", message: t("subscription.notStarted"), color: "gray" }
    }
    // Check if expired (only if end date has passed)
    if (isExpired(subscription)) {
      return { status: "expired", message: t("subscription.expiredStatus"), color: "red" }
    }
    if (isExpiringSoon(subscription, 7)) {
      const days = getDaysUntilExpiration(subscription)
      return { status: "expiring", message: t("subscription.expiresIn").replace("{days}", days.toString()), color: "yellow" }
    }
    return { status: "active", message: t("subscription.active"), color: "green" }
  }

  const statusInfo = getSubscriptionStatus()
  const daysUntilExpiration = subscription ? getDaysUntilExpiration(subscription) : 0

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance text-white">
            {t("subscription.title")}
          </h1>
          <p className="text-gray-300 text-balance">
            {t("subscription.subtitle")}
          </p>
        </div>

        {/* Free Trial Status */}
        {subscription && (subscription.status === "free_trial" || subscription.isFreeTrial) && (
          <Card className="shadow-2xl border-2 border-blue-500/50 bg-gradient-to-br from-blue-900/20 via-black/95 to-blue-900/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-blue-400 mb-2">
                    {t("subscription.freePlanDays").replace("{days}", getDaysUntilExpiration(subscription).toString())}
                  </h3>
                  <p className="text-gray-300 mb-2">
                    {t("subscription.freeTrialMessage")} {getSubscriptionEndDate(subscription).toLocaleDateString()}.
                  </p>
                  <p className="text-sm text-gray-400">
                    {t("subscription.afterTrial")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Payment Status */}
        {subscription && subscription.status === "pending" && (
          <Card className="shadow-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 via-black/95 to-yellow-900/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-yellow-400 mb-2">{t("subscription.paymentPending")}</h3>
                  <p className="text-gray-300 mb-2">
                    {t("subscription.paymentPendingMessage")}
                  </p>
                  <p className="text-sm text-blue-300">
                    {t("subscription.paymentPendingInfo")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not Started Subscription */}
        {subscription && isNotStarted(subscription) && (
          <Card className="shadow-2xl border-2 border-gray-500/50 bg-gradient-to-br from-gray-900/20 via-black/95 to-gray-900/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-400 mb-2">{t("subscription.notStarted")}</h3>
                  <p className="text-gray-300 mb-2">
                    {t("subscription.notStartedMessage")} <strong>{new Date(subscription.startDate).toLocaleDateString()}</strong>.
                  </p>
                  <p className="text-sm text-gray-400">
                    {t("subscription.notStartedInfo")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired Subscription Warning */}
        {subscription && isExpired(subscription) && !isNotStarted(subscription) && (
          <Card className="shadow-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-900/20 via-black/95 to-red-900/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-red-400 mb-2">{t("subscription.expired")}</h3>
                  <p className="text-gray-300 mb-4">
                    {t("subscription.expiredMessage")}
                  </p>
                  <p className="text-sm text-gray-400">
                    {t("subscription.expiredInfo")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Subscription Status */}
        {subscription && (
          <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-white">{t("subscription.current")}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {(() => {
                      const planKey = subscription.plan === "MONTHLY" ? "monthly" :
                                    subscription.plan === "THREE_MONTH" ? "starter" :
                                    subscription.plan === "SIX_MONTH" ? "professional" :
                                    subscription.plan === "TWELVE_MONTH" ? "enterprise" : "";
                      return planKey ? t(`plan.${planKey}`) : (PLAN_PRICING[subscription.plan]?.name || subscription.plan);
                    })()}
                  </CardDescription>
                </div>
                <Badge 
                  className={`${
                    statusInfo.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/50" :
                    statusInfo.status === "pending" || statusInfo.status === "expiring" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" :
                    statusInfo.status === "expired" ? "bg-red-500/20 text-red-400 border-red-500/50" :
                    statusInfo.status === "not_started" ? "bg-gray-500/20 text-gray-400 border-gray-500/50" :
                    statusInfo.status === "free_trial" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" :
                    "bg-gray-500/20 text-gray-400 border-gray-500/50"
                  }`}
                >
                  {statusInfo.message}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">{t("subscription.startDate")}</p>
                  <p className="text-sm text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(subscription.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">{t("subscription.endDate")}</p>
                  <p className="text-sm text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {getSubscriptionEndDate(subscription).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">{t("subscription.plan")}</p>
                  <p className="text-sm text-white">
                    {(() => {
                      const planKey = subscription.plan === "MONTHLY" ? "monthly" :
                                    subscription.plan === "THREE_MONTH" ? "starter" :
                                    subscription.plan === "SIX_MONTH" ? "professional" :
                                    subscription.plan === "TWELVE_MONTH" ? "enterprise" : "";
                      return planKey ? t(`plan.${planKey}`) : (PLAN_PRICING[subscription.plan]?.name || subscription.plan);
                    })()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">{t("subscription.price")}</p>
                  <p className="text-sm text-white font-semibold">€{PLAN_PRICING[subscription.plan]?.price || 0}</p>
                </div>
              </div>

              {isExpiringSoon(subscription, 7) && !isExpired(subscription) && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-400 mb-1">
                        {t("subscription.expiringSoon")}
                      </p>
                      <p className="text-xs text-gray-300">
                        {t("subscription.expiringSoonMessage").replace("{days}", daysUntilExpiration.toString())}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isNotStarted(subscription) && (
                <div className="mt-4 p-4 bg-gray-500/10 border border-gray-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-400 mb-1">
                        {t("subscription.notStarted")}
                      </p>
                      <p className="text-xs text-gray-300">
                        {t("subscription.notStartedMessage")} {new Date(subscription.startDate).toLocaleDateString()}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isExpired(subscription) && !isNotStarted(subscription) && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-400 mb-1">
                        {t("subscription.expired")}
                      </p>
                      <p className="text-xs text-gray-300">
                        {t("subscription.expiredMessage")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                onClick={() => handleRenew(subscription.plan)}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? t("subscription.processing") : t("subscription.renewSamePlan")}
              </Button>
            </CardFooter>
          </Card>
        )}

        {!subscription && (
          <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl text-white">{t("subscription.noActive")}</CardTitle>
              <CardDescription className="text-gray-400">
                {t("subscription.noActiveMessage")}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">
            {subscription ? t("subscription.upgradeOrChange") : t("subscription.choosePlan")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative border-2 transition-all duration-300 hover:shadow-2xl ${
                  plan.popular
                    ? "border-blue-500 shadow-xl scale-105 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95"
                    : "border-gray-800/50 hover:border-gray-700 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-1 text-xs font-medium text-white">
                      {t("subscription.mostPopular")}
                    </div>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {plan.period === "6 months" ? t("subscription.sixMonthSubscription") :
                     plan.period === "12 months" ? t("subscription.twelveMonthSubscription") :
                     `${plan.period} subscription`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">€{plan.price}</span>
                    <span className="text-gray-400">/ {plan.period}</span>
                  </div>
                  <ul className="space-y-2">
                    {PLAN_PRICING[plan.id]?.features.map((feature) => {
                      // Map feature names to translation keys
                      const featureKeyMap: Record<string, string> = {
                        "Repair Ticket Management": "repairTicketManagement",
                        "Customer Database": "customerDatabase",
                        "Payment Processing": "paymentProcessing",
                        "Analytics & Reports": "analyticsReports",
                        "Email Support": "emailSupport",
                        "Team Management": "teamManagement",
                        "Everything in 3 Months": "everythingIn3Months",
                        "Advanced Analytics": "advancedAnalytics",
                        "Priority Support": "prioritySupport",
                        "Custom Reports": "customReports",
                        "API Access": "apiAccess",
                        "Data Export": "dataExport",
                        "Everything in 6 Months": "everythingIn6Months",
                        "Unlimited Tickets": "unlimitedTickets",
                        "Dedicated Support": "dedicatedSupport",
                        "Custom Integrations": "customIntegrations",
                        "White Label Options": "whiteLabelOptions",
                        "Advanced Security": "advancedSecurity",
                      };
                      const translationKey = featureKeyMap[feature] || feature.toLowerCase().replace(/\s+/g, "").replace(/&/g, "").replace(/[^a-z0-9]/g, "");
                      return (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <span className="text-sm text-gray-300">{t(`feature.${translationKey}`) || feature}</span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
                <CardFooter>
                  {subscription && subscription.plan === plan.id ? (
                    <Button
                      onClick={() => handleRenew(plan.id)}
                      disabled={loading}
                      variant="outline"
                      className="w-full border-gray-700 bg-gray-900/50 text-white hover:bg-gray-800"
                    >
                      {loading ? t("subscription.processing") : t("subscription.renewPlan")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push(`/billing?plan=${plan.id}`)}
                      variant={plan.popular ? "default" : "outline"}
                      className="w-full"
                    >
                      {t("subscription.subscribe")}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Subscription History */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">{t("subscription.history")}</h2>
          <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
            <CardContent className="p-6">
              {subscriptionHistory.length === 0 ? (
                <p className="text-gray-400 text-center py-8">{t("subscription.noHistory")}</p>
              ) : (
                <div className="space-y-4">
                  {subscriptionHistory.map((historyItem: any, index: number) => (
                    <div
                      key={`${historyItem.id}_${index}`}
                      className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white font-semibold">
                            {(() => {
                              const planKey = historyItem.plan === "MONTHLY" ? "monthly" :
                                            historyItem.plan === "THREE_MONTH" ? "starter" :
                                            historyItem.plan === "SIX_MONTH" ? "professional" :
                                            historyItem.plan === "TWELVE_MONTH" ? "enterprise" : "";
                              return planKey ? t(`plan.${planKey}`) : (PLAN_PRICING[historyItem.plan as SubscriptionPlan]?.name || historyItem.plan);
                            })()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(historyItem.createdAt || historyItem.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          className={
                            historyItem.status === "ACTIVE" || historyItem.status === "active"
                              ? "bg-green-500/20 text-green-400 border-green-500/50"
                              : historyItem.status === "pending" || historyItem.status === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                              : historyItem.paymentStatus === "REJECTED" || historyItem.paymentStatus === "rejected"
                              ? "bg-red-500/20 text-red-400 border-red-500/50"
                              : "bg-gray-500/20 text-gray-400 border-gray-500/50"
                          }
                        >
                          {historyItem.paymentStatus === "REJECTED" || historyItem.paymentStatus === "rejected"
                            ? t("subscription.paymentDeclined")
                            : historyItem.paymentStatus === "APPROVED" || historyItem.paymentStatus === "approved"
                            ? t("subscription.paymentApproved")
                            : historyItem.status === "pending" || historyItem.status === "PENDING"
                            ? t("subscription.pending")
                            : historyItem.status === "expired" || historyItem.status === "EXPIRED"
                            ? t("subscription.expiredStatus")
                            : historyItem.status || "Unknown"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">{t("subscription.startDate")}</p>
                          <p className="text-white">
                            {new Date(historyItem.startDate).toLocaleDateString()}
                            {isNotStarted(historyItem) && (
                              <span className="ml-2 text-xs text-gray-400">{t("subscription.scheduled")}</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">{t("subscription.endDate")}</p>
                          <p className="text-white">
                            {getSubscriptionEndDate(historyItem).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">{t("subscription.price")}</p>
                          <p className="text-white font-semibold">
                            €{PLAN_PRICING[historyItem.plan as SubscriptionPlan]?.price || historyItem.price || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">{t("subscription.duration")}</p>
                          <p className="text-white">
                            {PLAN_PRICING[historyItem.plan as SubscriptionPlan]?.months || 0} {t("subscription.months")}
                          </p>
                        </div>
                      </div>
                      {isNotStarted(historyItem) && (
                        <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                          {t("subscription.scheduledMessage").replace("{date}", new Date(historyItem.startDate).toLocaleDateString())}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email Notification Info */}
        <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t("subscription.emailNotifications")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300">
              {t("subscription.emailNotificationMessage").replace("{email}", user?.email || "")}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

