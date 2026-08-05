import {
  DEFAULT_KEY_FIRST_PATTERN,
  type KeyFirstConfig,
} from "../../common/default-config";

export type KeyFirstMatcher = (value: string) => boolean;

const NEVER_MATCH: KeyFirstMatcher = () => false;

/**
 * Compiles key-first patterns as full-string matches so a matching fragment
 * cannot accidentally turn ordinary UI text into a translation key.
 */
export function createKeyFirstMatcher(
  config?: KeyFirstConfig
): KeyFirstMatcher {
  if (!config?.enabled) {
    return NEVER_MATCH;
  }

  const pattern = config.pattern || DEFAULT_KEY_FIRST_PATTERN;

  try {
    const matcher = new RegExp(`^(?:${pattern})$`);
    return (value: string) => matcher.test(value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid keyFirst.pattern "${pattern}": ${detail}. ` +
        "Use a valid JavaScript regular expression without delimiters."
    );
  }
}

/** Validate configuration before wrappers discover or write project files. */
export function validateKeyFirstConfig(config?: KeyFirstConfig): void {
  createKeyFirstMatcher(config);
}
