"use client"

import { useTranslations } from "next-intl"
import { AuthCard } from "@/components/auth/AuthCard"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"

export default function ForgotPasswordPage() {
  const t = useTranslations("auth")

  return (
    <AuthCard title={t("resetYourPassword")} description={t("enterEmailForReset")}>
      <ForgotPasswordForm />
    </AuthCard>
  )
}
