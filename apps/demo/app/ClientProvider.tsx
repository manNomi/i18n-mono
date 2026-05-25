"use client";

import { I18nProvider } from "i18nexus";
import dynamic from "next/dynamic";

import { loadNamespace } from "@/locales";
import {
  Analytics,
  FirebaseStatus,
  GlobalErrorProvider,
  ScrollRestorer,
} from "@/shared/ui";
import Navigation from "@/widgets/Navigation";

type DevtoolsProps = {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

const DisabledI18NexusDevtools = () => null;
const loadI18NexusDevtools = () =>
  import("i18nexus/devtools").then((module) => module.I18NexusDevtools);
const I18NexusDevtools =
  process.env.NODE_ENV === "production"
    ? DisabledI18NexusDevtools
    : dynamic<DevtoolsProps>(loadI18NexusDevtools, { ssr: false });

export function ClientProvider({
  children,
  language,
}: {
  children: React.ReactNode;
  language: string;
}) {
  return (
    <I18nProvider
      loadNamespace={loadNamespace}
      initialLanguage={language}
      fallbackNamespace="common"
      preloadNamespaces={["common", "home"]}
      languageManagerOptions={{
        defaultLanguage: "ko",
        availableLanguages: [
          { code: "ko", name: "한국어", flag: "🇰🇷" },
          { code: "en", name: "English", flag: "🇺🇸" },
        ],
        cookieName: "i18n-language",
        enableAutoDetection: true,
      }}
    >
      <GlobalErrorProvider>
        <ScrollRestorer />
        <Navigation />
        {children}
        <Analytics />
        <FirebaseStatus />
        <I18NexusDevtools position="bottom-right" />
      </GlobalErrorProvider>
    </I18nProvider>
  );
}
