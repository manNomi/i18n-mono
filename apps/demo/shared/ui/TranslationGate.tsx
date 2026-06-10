"use client";

import { useTranslation } from "i18nexus";
import type { ReactNode } from "react";

import { PageSkeleton } from "./PageLayout";

type TranslationGateProps = {
  children: ReactNode;
  namespace: string;
  skeleton?: "landing" | "docs" | "cards" | "form" | "dashboard";
};

export function TranslationGate({
  children,
  namespace,
  skeleton = "docs",
}: TranslationGateProps) {
  const { isReady } = useTranslation(namespace);

  if (!isReady) {
    return <PageSkeleton variant={skeleton} />;
  }

  return children;
}
