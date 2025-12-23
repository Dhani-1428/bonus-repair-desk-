"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Check, Sparkles } from "lucide-react"
import { SubscribeButton } from "./subscribe-button"
import { useTranslation } from "@/components/language-provider"

export default function PricingPage() {
  const { t } = useTranslation()
  
  const plans = [
    {
      id: "SIX_MONTH",
      name: "Professional",
      price: 100,
      period: t("subscription.sixMonths"),
      duration: t("subscription.sixMonths"),
      popular: true,
      features: [
        "Everything in Starter",
        "Priority email support",
        "Advanced analytics",
        "Custom dashboard",
        "API access",
        "Save €10",
      ],
    },
    {
      id: "TWELVE_MONTH",
      name: "Enterprise",
      price: 150,
      period: t("subscription.twelveMonths"),
      duration: t("subscription.twelveMonths"),
      popular: false,
      features: [
        "Everything in Professional",
        "24/7 premium support",
        "Custom branding",
        "Dedicated account manager",
        "Priority updates",
        "Save €50",
      ],
    },
  ]
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20 space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>Simple, transparent pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-balance">Choose your plan</h1>
            <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
              All plans include your custom admin panel with your shop name. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            {plans.map((plan, index) => (
              <Card
                key={plan.name}
                className={`relative border-2 transition-all duration-300 hover:shadow-2xl ${
                  plan.popular
                    ? "border-foreground shadow-xl scale-105 bg-card"
                    : "border-border hover:border-foreground/20"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-1 text-xs font-medium text-background">
                      Most popular
                    </div>
                  </div>
                )}
                <CardHeader className="pb-8 pt-8">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.period} subscription</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight">€{plan.price}</span>
                    <span className="text-muted-foreground text-lg">/ {plan.period}</span>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 mt-0.5">
                          <Check className="h-3 w-3 text-foreground" />
                        </div>
                        <span className="text-sm leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  <SubscribeButton
                    plan={plan.id as "SIX_MONTH" | "TWELVE_MONTH"}
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full rounded-full"
                  />
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">What happens when my subscription ends?</CardTitle>
                <CardDescription className="text-base">We keep your data safe and secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background font-bold text-lg">
                      1
                    </div>
                    <div className="space-y-1 pt-1">
                      <h4 className="font-semibold text-lg">Reminder notification</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        You'll receive an email 10 days before your subscription expires
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background font-bold text-lg">
                      2
                    </div>
                    <div className="space-y-1 pt-1">
                      <h4 className="font-semibold text-lg">Access paused</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        After expiry, your panel access is paused but all your data remains completely safe
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background font-bold text-lg">
                      3
                    </div>
                    <div className="space-y-1 pt-1">
                      <h4 className="font-semibold text-lg">Instant renewal</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Renew anytime to regain immediate access with all your data intact
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Developer Credit */}
      <div className="py-8 border-t border-gray-800/50 bg-black/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <p className="text-center text-sm text-gray-400">
            Developed by{" "}
            <a
              href="https://bonusitsolutions.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors duration-300 font-medium hover:underline"
            >
              Bonus IT Solutions
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
