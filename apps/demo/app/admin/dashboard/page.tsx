"use client";
import AdminDashboard from "@/page/admin-dashboard";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export default function AdminDashboardPage() {
  return (
    <TranslationGate namespace="admin-dashboard" skeleton="dashboard">
      <AdminDashboard />
    </TranslationGate>
  );
}
