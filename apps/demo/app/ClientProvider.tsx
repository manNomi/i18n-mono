"use client";

import { I18nProvider } from "i18nexus";
import dynamic from "next/dynamic";

import { loadNamespace } from "@/locales";
import commonEn from "@/locales/common/en.json";
import commonKo from "@/locales/common/ko.json";
import homeEn from "@/locales/home/en.json";
import homeKo from "@/locales/home/ko.json";
import { DEFAULT_DEMO_LANGUAGE, DEMO_LANGUAGE_COOKIE } from "@/shared/lib/demo-language";
import {
  Analytics,
  FirebaseStatus,
  GlobalErrorProvider,
  ScrollRestorer,
} from "@/shared/ui";
import Navigation from "@/widgets/Navigation";

const initialTranslations = {
  common: { en: commonEn, ko: commonKo },
  home: { en: homeEn, ko: homeKo },
};

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
      translations={initialTranslations}
      initialLanguage={language}
      fallbackNamespace="common"
      languageManagerOptions={{
        defaultLanguage: DEFAULT_DEMO_LANGUAGE,
        availableLanguages: [
          { code: "ko", name: "한국어", flag: "🇰🇷" },
          { code: "en", name: "English", flag: "🇺🇸" },
        ],
        cookieName: DEMO_LANGUAGE_COOKIE,
        enableAutoDetection: false,
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
