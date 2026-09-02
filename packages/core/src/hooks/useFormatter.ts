"use client";

import React from "react";
import { useI18nContext } from "../components/I18nProvider.js";
import { createFormatter, type I18nFormatter } from "../utils/formatter.js";

export function useFormatter(): I18nFormatter {
  const { currentLanguage } = useI18nContext();
  return React.useMemo(
    () => createFormatter(currentLanguage),
    [currentLanguage]
  );
}
