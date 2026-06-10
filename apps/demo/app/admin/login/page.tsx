"use client";
import AdminLoginPage from "@/page/admin-login";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export default function Page() {
  return (
    <TranslationGate namespace="common" skeleton="form">
      <AdminLoginPage />
    </TranslationGate>
  );
}
