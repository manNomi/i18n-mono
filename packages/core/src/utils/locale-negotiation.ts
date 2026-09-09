/** Runtime-neutral language negotiation for server and Edge entrypoints. */

export interface LanguageNegotiationOptions {
  cookieName?: string;
  defaultLanguage?: string;
  availableLanguages?: readonly string[];
}

export interface ParsedLanguageRange {
  code: string;
  quality: number;
  index: number;
}

/** Parse an Accept-Language header and return the configured language casing. */
export function parseAcceptLanguage(
  acceptLanguage: string,
  availableLanguages: readonly string[]
): string | null {
  if (!acceptLanguage || !availableLanguages.length) {
    return null;
  }

  const languages = acceptLanguage
    .split(",")
    .map((languageRange, index) => {
      const [rawCode, ...parameters] = languageRange.trim().split(";");
      const code = rawCode.trim().toLowerCase();
      const qualityParameter = parameters.find((parameter) =>
        /^\s*q\s*=/i.test(parameter)
      );
      const rawQuality = qualityParameter?.split("=", 2)[1]?.trim();
      const validQuality =
        rawQuality === undefined ||
        /^(?:0(?:\.\d{1,3})?|1(?:\.0{1,3})?)$/.test(rawQuality);
      const quality = rawQuality === undefined ? 1 : Number(rawQuality);

      return { code, index, quality, validQuality };
    })
    .filter(
      ({ code, quality, validQuality }) =>
        code.length > 0 && code !== "*" && validQuality && quality > 0
    )
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { code } of languages) {
    const exactMatch = availableLanguages.find(
      (language) => language.toLowerCase() === code
    );
    if (exactMatch) {
      return exactMatch;
    }

    const primaryLang = code.split("-")[0];
    const primaryMatch = availableLanguages.find(
      (language) => language.toLowerCase() === primaryLang
    );
    if (primaryMatch) {
      return primaryMatch;
    }

    const regionalMatch = availableLanguages.find((language) =>
      language.toLowerCase().startsWith(`${primaryLang}-`)
    );
    if (regionalMatch) {
      return regionalMatch;
    }
  }

  return null;
}

/** Parse a Cookie header without letting one malformed value poison the rest. */
export function parseCookies(
  cookieHeader: string | null
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    try {
      const name = decodeURIComponent(cookie.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(cookie.slice(separatorIndex + 1).trim());

      if (!Object.prototype.hasOwnProperty.call(cookies, name)) {
        Object.defineProperty(cookies, name, {
          value,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    } catch {
      // Ignore malformed percent encoding in one cookie and keep negotiating.
    }
  }

  return cookies;
}

/** Resolve a language from Web-standard Headers in Node, Edge, or browsers. */
export function getServerLanguage(
  headers: Headers,
  options: LanguageNegotiationOptions = {}
): string {
  const cookieName = options.cookieName || "i18n-language";
  const defaultLanguage = options.defaultLanguage || "en";
  const availableLanguages = options.availableLanguages || [];
  const cookieHeader = headers.get("cookie");

  if (cookieHeader) {
    const cookieLanguage = parseCookies(cookieHeader)[cookieName];
    if (
      cookieLanguage !== undefined &&
      (availableLanguages.length === 0 ||
        availableLanguages.includes(cookieLanguage))
    ) {
      return cookieLanguage;
    }
  }

  if (availableLanguages.length > 0) {
    const acceptedLanguage = headers.get("accept-language");
    if (acceptedLanguage) {
      const detectedLanguage = parseAcceptLanguage(
        acceptedLanguage,
        availableLanguages
      );
      if (detectedLanguage) {
        return detectedLanguage;
      }
    }
  }

  return defaultLanguage;
}
