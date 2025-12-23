"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { TrashDevices } from "@/components/trash-devices"
import { useTranslation } from "@/components/language-provider"

export default function TrashPage() {
  const { t } = useTranslation()

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance text-white">
            {t("page.trash.title")}
          </h1>
          <p className="text-gray-300 text-balance">{t("page.trash.subtitle")}</p>
        </div>
        <TrashDevices />
      </div>
    </DashboardLayout>
  )
}

