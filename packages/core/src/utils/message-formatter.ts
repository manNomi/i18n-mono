export type MessageFormatterValues = Record<string, unknown>;

export type MessageFormatPrimitive =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | undefined;

export type MessageFormatRichTag<T> = (chunks: T[]) => T;

export type MessageFormatRichValues<T> = Record<
  string,
  MessageFormatPrimitive | T | MessageFormatRichTag<T>
>;

export interface MessageFormatContext {
  locale: string;
  message: string;
  key?: string;
}

export interface MessageFormatRequest<
  TValues extends object = MessageFormatterValues,
> extends MessageFormatContext {
  values?: TValues;
}

/**
 * A runtime-neutral message formatter boundary.
 *
 * Implementations may return a string, a rich value, or an array of rich
 * values. The React adapter owns the ReactNode specialization.
 */
export interface MessageFormatter<
  TValues extends object = MessageFormatterValues,
  TOutput = unknown,
> {
  format(request: MessageFormatRequest<TValues>): TOutput;
}

export type I18nMessageFormatErrorReason =
  | "compile"
  | "format"
  | "formatter-required"
  | "rich-result";

const getCauseMessage = (cause: unknown): string => {
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }

  if (typeof cause === "string") {
    return cause;
  }

  return "Unknown formatting failure";
};

const serializeContextValue = (value: string | undefined): string => {
  return JSON.stringify(value ?? "<unknown>");
};

export class I18nMessageFormatError extends Error {
  readonly reason: I18nMessageFormatErrorReason;
  readonly locale: string;
  readonly translationKey?: string;
  readonly translationMessage: string;
  readonly cause: unknown;

  constructor(
    reason: I18nMessageFormatErrorReason,
    context: MessageFormatContext,
    cause: unknown
  ) {
    super(
      `[i18nexus] Message formatting failed (${reason}) for locale ${serializeContextValue(
        context.locale
      )}, key ${serializeContextValue(context.key)}: ${getCauseMessage(cause)}`
    );
    this.name = "I18nMessageFormatError";
    this.reason = reason;
    this.locale = context.locale;
    this.translationKey = context.key;
    this.translationMessage = context.message;
    this.cause = cause;
    Object.setPrototypeOf(this, I18nMessageFormatError.prototype);
  }
}

export const hasMessageBraces = (message: string): boolean => {
  return message.includes("{") || message.includes("}");
};

/**
 * A parser failure may be treated as legacy interpolation only when removing
 * every legacy token leaves no braces. This keeps malformed and mixed ICU
 * messages visible instead of silently returning partial output.
 */
export const isLegacyInterpolationOnly = (message: string): boolean => {
  let foundLegacyToken = false;
  const remainder = message.replace(/\{\{([A-Za-z_]\w*)\}\}/g, () => {
    foundLegacyToken = true;
    return "";
  });

  return foundLegacyToken && !hasMessageBraces(remainder);
};

export const ensureMessageFormatter = <
  TValues extends object = MessageFormatterValues,
  TOutput = unknown,
>(
  formatter: MessageFormatter<TValues, TOutput> | undefined,
  context: MessageFormatContext
): MessageFormatter<TValues, TOutput> => {
  if (formatter) {
    return formatter;
  }

  throw new I18nMessageFormatError(
    "formatter-required",
    context,
    new Error(
      "Pass a MessageFormatter to I18nProvider or use IcuI18nProvider from i18nexus/icu."
    )
  );
};

export const toI18nMessageFormatError = (
  reason: I18nMessageFormatErrorReason,
  context: MessageFormatContext,
  cause: unknown
): I18nMessageFormatError => {
  if (cause instanceof I18nMessageFormatError) {
    return cause;
  }

  return new I18nMessageFormatError(reason, context, cause);
};
