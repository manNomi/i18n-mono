import IntlMessageFormat from "intl-messageformat";
import {
  type MessageFormatRequest,
  type MessageFormatter,
  type MessageFormatterValues,
  toI18nMessageFormatError,
} from "./message-formatter.js";

const MAX_COMPILED_MESSAGE_CACHE_SIZE = 500;

type CompiledMessage = InstanceType<typeof IntlMessageFormat>;
type IcuVariableRequirement = { name: string; kind: "select" | "plural" };
type CompiledMessageEntry = {
  formatter: CompiledMessage;
  requirements: IcuVariableRequirement[];
};
type IcuMessageElement = {
  type: number;
  value?: string;
  options?: Record<string, { value: IcuMessageElement[] }>;
  children?: IcuMessageElement[];
};

export type IcuMessageFormatter<
  TValues extends object = MessageFormatterValues,
  TOutput = unknown,
> = MessageFormatter<TValues, TOutput>;

export interface IcuMessageFormatterCacheEvent {
  type: "hit" | "evict";
  cacheKey: string;
  evictedKey?: string;
}

export interface IcuMessageFormatterOptions {
  onCacheEvent?: (event: IcuMessageFormatterCacheEvent) => void;
}

const getCacheKey = (locale: string, message: string): string =>
  JSON.stringify([locale, message]);

const getIcuVariableRequirements = (
  elements: IcuMessageElement[]
): IcuVariableRequirement[] => {
  const requirements = new Map<string, IcuVariableRequirement>();
  const visit = (nodes: IcuMessageElement[]): void => {
    for (const node of nodes) {
      if ((node.type === 5 || node.type === 6) && node.value) {
        const requirement: IcuVariableRequirement = {
          name: node.value,
          kind: node.type === 5 ? "select" : "plural",
        };
        requirements.set(
          `${requirement.kind}:${requirement.name}`,
          requirement
        );
      }
      if (node.options) {
        for (const option of Object.values(node.options)) {
          visit(option.value);
        }
      }
      if (node.children) visit(node.children);
    }
  };
  visit(elements);
  return [...requirements.values()];
};

const validateIcuMessageValues = (
  requirements: IcuVariableRequirement[],
  values: object | undefined
): void => {
  const record = values as Record<string, unknown> | undefined;
  for (const requirement of requirements) {
    const value = record?.[requirement.name];
    if (value === undefined) continue;
    if (requirement.kind === "select" && typeof value !== "string") {
      throw new TypeError(
        `The ICU select variable ${JSON.stringify(requirement.name)} must be a string.`
      );
    }
    if (
      requirement.kind === "plural" &&
      !(
        typeof value === "bigint" ||
        (typeof value === "number" && Number.isFinite(value))
      )
    ) {
      throw new TypeError(
        `The ICU plural variable ${JSON.stringify(
          requirement.name
        )} must be a finite number or bigint.`
      );
    }
  }
};

export function createIcuMessageFormatter<
  TValues extends object = MessageFormatterValues,
  TOutput = unknown,
>(
  options: IcuMessageFormatterOptions = {}
): IcuMessageFormatter<TValues, TOutput> {
  const cache = new Map<string, CompiledMessageEntry>();
  const getCompiledMessage = (
    request: MessageFormatRequest<TValues>
  ): CompiledMessageEntry => {
    const cacheKey = getCacheKey(request.locale, request.message);
    const cached = cache.get(cacheKey);
    if (cached) {
      cache.delete(cacheKey);
      cache.set(cacheKey, cached);
      options.onCacheEvent?.({ type: "hit", cacheKey });
      return cached;
    }
    let formatter: CompiledMessage;
    try {
      formatter = new IntlMessageFormat(request.message, request.locale);
    } catch (error) {
      throw toI18nMessageFormatError("compile", request, error);
    }
    if (cache.size >= MAX_COMPILED_MESSAGE_CACHE_SIZE) {
      const evictedKey = cache.keys().next().value;
      if (evictedKey) {
        cache.delete(evictedKey);
        options.onCacheEvent?.({ type: "evict", cacheKey, evictedKey });
      }
    }
    const compiled = {
      formatter,
      requirements: getIcuVariableRequirements(
        formatter.getAst() as IcuMessageElement[]
      ),
    };
    cache.set(cacheKey, compiled);
    return compiled;
  };
  return {
    format(request) {
      const compiled = getCompiledMessage(request);
      try {
        validateIcuMessageValues(compiled.requirements, request.values);
        return compiled.formatter.format(request.values as never) as TOutput;
      } catch (error) {
        throw toI18nMessageFormatError("format", request, error);
      }
    },
  };
}
