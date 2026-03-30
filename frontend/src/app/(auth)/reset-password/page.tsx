"use client"

import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { AuthCard } from "@/components/auth/AuthCard"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"

export default function ResetPasswordPage() {
  const t = useTranslations("auth")

  return (
    <AuthCard title={t("resetYourPassword")} description={t("enterNewPassword")}>
      <Suspense fallback={<div className="text-center py-4">{t("loading")}</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
