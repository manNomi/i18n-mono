export interface I18nFormatter {
  number(value: number | bigint, options?: Intl.NumberFormatOptions): string;
  currency(
    value: number | bigint,
    currency: string,
    options?: Omit<Intl.NumberFormatOptions, "style" | "currency">
  ): string;
  dateTime(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  relativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions
  ): string;
  list(value: Iterable<string>, options?: Intl.ListFormatOptions): string;
}

const formatterConstructors = [
  Intl.NumberFormat,
  Intl.DateTimeFormat,
  Intl.RelativeTimeFormat,
  Intl.ListFormat,
] as const;

type NativeFormatter =
  | Intl.NumberFormat
  | Intl.DateTimeFormat
  | Intl.RelativeTimeFormat
  | Intl.ListFormat;

const isCacheableOptions = (
  options: unknown
): options is Record<string, unknown> | undefined => {
  if (options === undefined) return true;
  if (options === null || typeof options !== "object") return false;

  try {
    const prototype = Object.getPrototypeOf(options);
    if (prototype !== Object.prototype && prototype !== null) return false;

    return Object.values(Object.getOwnPropertyDescriptors(options)).every(
      (descriptor) =>
        descriptor.enumerable &&
        "value" in descriptor &&
        (descriptor.value === null ||
          (typeof descriptor.value !== "object" &&
            typeof descriptor.value !== "function"))
    );
  } catch {
    return false;
  }
};

const getOptionsKey = (type: number, options: Record<string, unknown>) =>
  JSON.stringify([
    type,
    Object.keys(options)
      .sort()
      .map((key) => [key, typeof options[key], String(options[key])]),
  ]);

const withCurrencyOptions = (
  options: unknown,
  currency: string
): unknown => {
  if (
    options === null ||
    (options !== undefined &&
      typeof options !== "object" &&
      typeof options !== "function")
  ) {
    return options;
  }

  if (isCacheableOptions(options)) {
    return { ...options, style: "currency", currency };
  }

  return Object.defineProperties(Object.create(options), {
    style: { value: "currency", enumerable: true },
    currency: { value: currency, enumerable: true },
  });
};

export function createFormatter(locale: string): I18nFormatter {
  const cache = new Map<string, NativeFormatter>();
  const getFormatter = (type: number, options: unknown) => {
    const Formatter = formatterConstructors[type] as unknown as new (
      locale: string,
      options?: object
    ) => NativeFormatter;
    if (!isCacheableOptions(options)) {
      return new Formatter(locale, options as object | undefined);
    }

    const key = getOptionsKey(type, options ?? {});
    let formatter = cache.get(key);
    if (!formatter) {
      formatter = new Formatter(locale, options as object | undefined);
      cache.set(key, formatter);
      if (cache.size > 100) cache.delete(cache.keys().next().value as string);
    }
    return formatter;
  };

  return {
    number(value, options) {
      return (getFormatter(0, options) as Intl.NumberFormat).format(value);
    },
    currency(value, currency, options) {
      const currencyOptions = withCurrencyOptions(options, currency);
      return (getFormatter(0, currencyOptions) as Intl.NumberFormat).format(value);
    },
    dateTime(value, options) {
      if (!(value instanceof Date) && typeof value !== "number") {
        throw new TypeError("Expected Date or number.");
      }
      return (getFormatter(1, options) as Intl.DateTimeFormat).format(value);
    },
    relativeTime(value, unit, options) {
      return (getFormatter(2, options) as Intl.RelativeTimeFormat).format(value, unit);
    },
    list(value, options) {
      return (getFormatter(3, options) as Intl.ListFormat).format(value);
    },
  };
}
