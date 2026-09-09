"use client";

import React, { type ReactNode } from "react";
import {
  I18nProvider,
  type I18nProviderProps,
  type NamespaceTranslations,
} from "../components/I18nProvider.js";
import {
  useTranslation,
  type TranslationFunction,
  type UseTranslationReturn,
} from "../hooks/useTranslation.js";
import {
  createI18n,
  type CreateI18nInstance,
  type CreateI18nOptions,
  type I18nTranslations,
} from "./createI18n.js";
import {
  createIcuMessageFormatter,
  type IcuMessageFormatter,
} from "./icu-formatter.js";
import type {
  MessageFormatRichTag,
  MessageFormatRichValues,
} from "./message-formatter.js";

export type IcuRichTag = MessageFormatRichTag<ReactNode>;
export type IcuRichMessageValues = MessageFormatRichValues<ReactNode>;

export type IcuTranslationFunction<K extends string = string> =
  TranslationFunction<K> & {
    rich(key: K, values?: IcuRichMessageValues): ReactNode;
  };

export interface IcuUseTranslationReturn<
  K extends string = string,
> extends Omit<UseTranslationReturn<K>, "t"> {
  t: IcuTranslationFunction<K>;
}

export interface IcuI18nProviderProps<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
> extends Omit<I18nProviderProps<TTranslations>, "messageFormatter"> {
  messageFormatter?: IcuMessageFormatter;
}

export function IcuI18nProvider<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
>({
  messageFormatter,
  ...props
}: IcuI18nProviderProps<TTranslations>): React.ReactElement {
  const formatter = React.useMemo(
    () => messageFormatter || createIcuMessageFormatter(),
    [messageFormatter]
  );
  return React.createElement(I18nProvider<TTranslations>, {
    ...props,
    messageFormatter: formatter,
  });
}

export function useIcuTranslation<K extends string = string>(
  namespace?: string
): IcuUseTranslationReturn<K> {
  return useTranslation<K>(namespace) as IcuUseTranslationReturn<K>;
}

export interface CreateIcuI18nOptions<
  TTranslations extends I18nTranslations = I18nTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
> extends Omit<
  CreateI18nOptions<TTranslations, FallbackNamespace>,
  "messageFormatter"
> {
  messageFormatter?: IcuMessageFormatter;
}

export function createIcuI18n<
  TTranslations extends I18nTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
>(
  translations: TTranslations,
  options: CreateIcuI18nOptions<TTranslations, FallbackNamespace> = {}
): CreateI18nInstance<TTranslations, FallbackNamespace> {
  return createI18n(translations, {
    ...options,
    messageFormatter: options.messageFormatter || createIcuMessageFormatter(),
  });
}
