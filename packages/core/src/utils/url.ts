export type LocalizedUrlStrategy = "prefix" | "query";

export interface LocalizedUrlOptions {
  /** URL language placement strategy. Defaults to "prefix". */
  strategy?: LocalizedUrlStrategy;
  /** Known language codes used to replace an existing URL language segment. */
  languages?: readonly string[];
  /** Default language. Omitted from URLs unless includeDefaultLanguage is true. */
  defaultLanguage?: string;
  /** Keep the default language in generated URLs. */
  includeDefaultLanguage?: boolean;
  /** Query parameter name for strategy="query". Defaults to "lang". */
  queryParam?: string;
  /** Optional app base path, e.g. "/docs". */
  basePath?: string;
}

const LOCAL_URL_BASE = "https://i18nexus.local";

function normalizePath(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const path = value.trim();
  if (!path || path === "/") {
    return "";
  }

  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}

function getPathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function toLanguageSet(languages?: readonly string[]): Set<string> {
  return new Set(
    (languages || [])
      .map((language) => language.trim())
      .filter((language) => language.length > 0)
  );
}

function isKnownLanguageSegment(
  segment: string | undefined,
  languages: Set<string>
): boolean {
  return Boolean(segment && languages.has(segment));
}

function createUrl(input: string): { url: URL; absolute: boolean } {
  const absolute = /^[A-Za-z][A-Za-z\d+\-.]*:/.test(input);
  return {
    url: absolute ? new URL(input) : new URL(input, LOCAL_URL_BASE),
    absolute,
  };
}

function formatUrl(url: URL, absolute: boolean): string {
  if (absolute) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function getLanguageIndex(pathname: string, basePath: string): number {
  const pathSegments = getPathSegments(pathname);
  const baseSegments = getPathSegments(basePath);

  if (
    baseSegments.length > 0 &&
    !baseSegments.every((segment, index) => pathSegments[index] === segment)
  ) {
    return 0;
  }

  return baseSegments.length;
}

function setPathnameSegments(url: URL, segments: string[]): void {
  url.pathname = `/${segments.join("/")}`;
}

export function getLanguageFromUrl(
  input: string,
  options: LocalizedUrlOptions = {}
): string | undefined {
  const { url } = createUrl(input);
  const strategy = options.strategy || "prefix";

  if (strategy === "query") {
    return url.searchParams.get(options.queryParam || "lang") || undefined;
  }

  const languages = toLanguageSet(options.languages);
  const segments = getPathSegments(url.pathname);
  const index = getLanguageIndex(url.pathname, normalizePath(options.basePath));
  const segment = segments[index];

  if (languages.size === 0) {
    return segment;
  }

  return isKnownLanguageSegment(segment, languages) ? segment : undefined;
}

export function removeLanguageFromUrl(
  input: string,
  options: LocalizedUrlOptions = {}
): string {
  const { url, absolute } = createUrl(input);
  const strategy = options.strategy || "prefix";

  if (strategy === "query") {
    url.searchParams.delete(options.queryParam || "lang");
    return formatUrl(url, absolute);
  }

  const languages = toLanguageSet(options.languages);
  const segments = getPathSegments(url.pathname);
  const index = getLanguageIndex(url.pathname, normalizePath(options.basePath));

  if (
    isKnownLanguageSegment(segments[index], languages) ||
    (languages.size === 0 && segments[index] === options.defaultLanguage)
  ) {
    segments.splice(index, 1);
  }

  setPathnameSegments(url, segments);
  return formatUrl(url, absolute);
}

export function localizeUrl(
  input: string,
  language: string,
  options: LocalizedUrlOptions = {}
): string {
  const nextLanguage = language.trim();
  if (!nextLanguage) {
    return input;
  }

  const { url, absolute } = createUrl(input);
  const strategy = options.strategy || "prefix";
  const defaultLanguage = options.defaultLanguage?.trim();
  const includeLanguage =
    options.includeDefaultLanguage || nextLanguage !== defaultLanguage;

  if (strategy === "query") {
    const queryParam = options.queryParam || "lang";
    if (includeLanguage) {
      url.searchParams.set(queryParam, nextLanguage);
    } else {
      url.searchParams.delete(queryParam);
    }
    return formatUrl(url, absolute);
  }

  const languages = toLanguageSet(options.languages);
  const segments = getPathSegments(url.pathname);
  const index = getLanguageIndex(url.pathname, normalizePath(options.basePath));

  if (
    isKnownLanguageSegment(segments[index], languages) ||
    (languages.size === 0 && segments[index] === defaultLanguage)
  ) {
    segments.splice(index, 1);
  }

  if (includeLanguage) {
    segments.splice(index, 0, nextLanguage);
  }

  setPathnameSegments(url, segments);
  return formatUrl(url, absolute);
}
