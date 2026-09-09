# i18nexus Public Behavior Contract

This contract covers behavior observable through published package entrypoints.
`PROVED` means normal, boundary/failure, and repeat/recovery behavior has
executable evidence within the declared support scope.

## Support Scope

| Surface                            | Contract                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Node                               | 22.x, 24.x, 26.x                                                           |
| React / React DOM                  | 18.x, 19.x                                                                 |
| Core format                        | ESM root, server, and devtools subpaths                                    |
| Tools format                       | CommonJS executables; root import intentionally empty                      |
| Local platforms                    | macOS arm64 and CI Linux                                                   |
| Server runtime                     | Node filesystem only; Edge is unsupported                                  |
| Locale shape                       | flat JSON object with string values; dotted keys are literal               |
| Nested/plural/select/gender engine | not provided                                                               |
| Windows                            | outside the verified claim until a Windows CI gate exists                  |
| Live Google account policy/quota   | external acceptance item; deterministic package behavior is locally mocked |

## Published Entrypoints

| Package path          | Public surface                                               | Artifact evidence                                                                              | Status |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------ |
| `i18nexus`            | Provider, hooks, typed factory/config, URL helpers and types | ESM + CJS dynamic import, TypeScript consumer, React 18/19 tarball smoke, browser bundle smoke | PROVED |
| `i18nexus/server`     | negotiation, filesystem loading, translation and cache APIs  | installed tarball import + server/file/cache suites                                            | PROVED |
| `i18nexus/devtools`   | development-only React inspector                             | installed tarball import + UI behavior suite                                                   | PROVED |
| `i18nexus-tools`      | intentionally empty root module                              | installed CommonJS + TypeScript consumer smoke                                                 | PROVED |
| `i18nexus-tools` bins | 11 executables                                               | installed help/startup audit + command fixtures                                                | PROVED |

## Root Export Inventory

| Runtime exports                                              | Behavior ID        |
| ------------------------------------------------------------ | ------------------ |
| `I18nProvider`, `useI18nContext`                             | CORE-PROVIDER-001  |
| `useTranslation`                                             | CORE-TRANSLATE-001 |
| `useLanguageSwitcher`                                        | CORE-LANGUAGE-001  |
| `createI18n`                                                 | CORE-TYPED-001     |
| `defineConfig`                                               | CORE-CONFIG-001    |
| `getLanguageFromUrl`, `localizeUrl`, `removeLanguageFromUrl` | CORE-URL-001       |

Type-only exports are `I18nProviderProps`, `I18nContextType`,
`NamespaceTranslations`, `NamespaceLoader`, `TranslationVariables`,
`TranslationStyles`, `VariableStyle`, `TranslationFunction`,
`UseTranslationReturn`, `UseLanguageSwitcherReturn`, `I18nTranslations`,
`CreateI18nOptions`, `CreateI18nInstance`,
`CreateI18nUseTranslationReturn`, `LanguageConfig`,
`LanguageManagerOptions`, `ExtractLanguages`, `I18nexusConfig`,
`LocalizedUrlOptions`, and `LocalizedUrlStrategy`.

## Server And Devtools Inventory

| Exports                                                           | Behavior ID          |
| ----------------------------------------------------------------- | -------------------- |
| `parseAcceptLanguage`, `getServerLanguage`, `parseCookies`        | SERVER-NEGOTIATE-001 |
| `createServerTranslation`, `getServerTranslations`                | SERVER-TRANSLATE-001 |
| `loadTranslations`                                                | SERVER-LOAD-001      |
| `getTranslation`, `GetTranslationOptions`, `GetTranslationReturn` | SERVER-GET-001       |
| `invalidateCache`                                                 | SERVER-CACHE-001     |
| `createServerI18nWithTranslations`                                | SERVER-PRELOADED-001 |
| `ServerTranslationVariables`                                      | SERVER-TRANSLATE-001 |
| `I18NexusDevtools`, `I18NexusDevtoolsProps`                       | CORE-DEVTOOLS-001    |

## Behavior Matrix

| Behavior ID            | Normal                                                                                                              | Boundary / failure                                                                                                                                                                          | Repeat / concurrency / recovery                                                                                         | Evidence                                                                                | Status |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| CORE-PROVIDER-001      | provides language/resources and renders children                                                                    | outside-provider access throws; invalid language and persistence failure reject; empty resources are valid                                                                                  | same-language no-op; duplicate namespace loads coalesce; failed load is not committed and explicit retry works          | `I18nProvider.test.tsx`, lazy/fallback suites                                           | PROVED |
| CORE-TRANSLATE-001     | resolves namespace/fallback and interpolates variables/styles                                                       | missing key returns key; missing variable stays visible; empty string stays empty                                                                                                           | snapshot changes with language/resource state; loader rejection is consumed by hooks/preload                            | namespace, fallback, interpolation tests                                                | PROVED |
| CORE-LANGUAGE-001      | persists a valid switch and updates Provider/document/listeners                                                     | invalid language rejects; empty next/previous controls are no-ops; guarded browser detection returns null/default                                                                           | next/previous wrap; public reset stays synchronized; concurrent calls are invocation-order last-call-wins               | provider/language tests                                                                 | PROVED |
| CORE-TYPED-001         | binds static translations with namespace/key inference                                                              | missing runtime key returns key; invalid generic use fails consumer compilation                                                                                                             | reusable factory; Provider instances own state                                                                          | `createI18n.test.tsx`, installed TypeScript fixture                                     | PROVED |
| CORE-CONFIG-001        | identity helper infers language union                                                                               | default/source outside language tuple fail TypeScript                                                                                                                                       | repeat returns the same object; no I/O                                                                                  | installed `@ts-expect-error` consumer fixture                                           | PROVED |
| CORE-URL-001           | prefix/query read, add, replace and remove preserve query/hash                                                      | empty target returns input; unknown prefix is preserved; malformed absolute URL has controlled behavior                                                                                     | localization is idempotent; WHATWG URL semantics                                                                        | `url.test.ts`                                                                           | PROVED |
| CORE-DEVTOOLS-001      | opens and displays Provider state in development                                                                    | Escape closes; production renders null; outside Provider throws                                                                                                                             | remount resets local panel state                                                                                        | `I18NexusDevtools.test.tsx`                                                             | PROVED |
| SERVER-NEGOTIATE-001   | cookie, then weighted exact/primary/regional header match, then default                                             | q=0, invalid/out-of-range q, wildcard and malformed cookie encoding are ignored safely; duplicate cookie first wins                                                                         | stable equal-q order; configured language casing is returned                                                            | accept-language/cookie/server tests                                                     | PROVED |
| SERVER-TRANSLATE-001   | legacy or namespace maps merge and interpolate                                                                      | missing key returns fallback/key; missing variable remains; empty string is preserved                                                                                                       | pure and reusable; later merge assignment wins                                                                          | server/interpolation tests + benchmark                                                  | PROVED |
| SERVER-LOAD-001        | loads flat/namespace JSON under a locale root                                                                       | missing root returns `{}`; malformed/non-string resources warn and are omitted; symlink entries are ignored; directory errors reject                                                        | caller repairs and retries; no cache in this API                                                                        | server translation tests                                                                | PROVED |
| SERVER-GET-001         | explicit options override JSON/defaults and return dictionary/translator                                            | missing/malformed resource rejects; traversal and escaping symlink reject; JS/TS config warns and is ignored; unavailable Next request headers select the configured default                | root/fallback-scoped cache; disable/bypass and invalidation recover                                                     | 42+ focused server cases                                                                | PROVED |
| SERVER-CACHE-001       | same scoped request reuses data                                                                                     | selector variants and TTL boundaries are explicit                                                                                                                                           | concurrent/sequential roots isolate; selected/all invalidation works; timer is unref'd                                  | cache cases in server suite                                                             | PROVED |
| SERVER-PRELOADED-001   | detects language and translates provided resources without filesystem access                                        | malformed cookie/header safely falls back; missing key returns key                                                                                                                          | pure resource reuse                                                                                                     | direct preloaded server tests                                                           | PROVED |
| CLI-WRAP-001           | adaptive wrapper transforms eligible source and reports strategy                                                    | no matches/help/unknown option are controlled; dry-run is byte-identical; parse errors surface                                                                                              | repeat is idempotent; per-file source writes are not a multi-file transaction                                           | wrapper unit/E2E + installed smoke                                                      | PROVED |
| CLI-SWC-001            | deprecated alias runs the same adaptive engine and names the selected strategy                                      | unknown option exits nonzero; dry-run is byte-identical                                                                                                                                     | same idempotency/recovery as standard wrapper; explicit SWC uses worker bin                                             | installed alias fixture + wrapper tests                                                 | PROVED |
| CLI-WORKER-001         | SWC worker pool transforms files with bounded worker count                                                          | parse failure is reported and contributes failure count                                                                                                                                     | normal `terminate()` does not create false errors/open handles; repeat is idempotent                                    | active worker E2E/pool tests                                                            | PROVED |
| CLI-EXTRACT-001        | extracts static keys and merges locale/index/type outputs                                                           | invalid option and strict/malformed inputs fail; dry-run writes nothing                                                                                                                     | preserves existing values; repeated output is deterministic; multi-file generation is not transactional                 | extractor unit/E2E/workflow tests                                                       | PROVED |
| CLI-TYPE-001           | generates declarations from locale resources                                                                        | missing/empty/strict-incomplete resources have controlled outcomes                                                                                                                          | repeated generation is deterministic; installed consumers compile                                                       | type generator + CLI E2E                                                                | PROVED |
| CLI-UPLOAD-001         | authenticates and uploads flat/namespaced resources; normal appends new keys; force and auto-translate are explicit | missing ID/credentials, configured locale file, or malformed local data fail before remote mutation; local symlinks reject; dry-run isolates auth/network/write; diagnostics redact secrets | dynamic configured language columns preserve locale-code casing; remote writes are not transactional; rerun is recovery | active mocked integration, append/force/formula, preflight, dry-run and redaction tests | PROVED |
| CLI-DOWNLOAD-001       | incremental mode preserves non-empty/local-only values and fills missing/empty values                               | malformed local data, missing requested column, path/symlink escape, fetch or commit failure leaves/restores original bytes; dry-run is isolated                                            | one locale-root transaction with journal recovery; repeat adds no duplicates                                            | mode, dynamic-column, transaction, interruption and integration tests                   | PROVED |
| CLI-DOWNLOAD-FORCE-001 | replaces locale content with remote snapshot, including intentional empty-string values                             | shares validation/dry-run/failure rollback with normal mode; empty remote sheet leaves local files unchanged                                                                                | same journal recovery and deterministic repeat                                                                          | mode/transaction tests                                                                  | PROVED |
| CLI-SHEETS-001         | initializes JSON config/resources and exposes upload/download/sync actions                                          | deprecated TS flag warns; missing remote config exits 1; existing generated/user files, including `.env.sheets`, are skipped; local sync/CSV/index commits roll back                        | init rerun is non-clobbering; remote and local sync sides are not one distributed transaction                           | built CLI E2E + create-if-absent unit + manager transaction integration                 | PROVED |
| CLI-CLEAN-001          | backs up and removes unused keys                                                                                    | malformed/non-object JSON and backup/stage/commit failures reject and restore bytes; dry-run is isolated                                                                                    | stable-source repeat is idempotent; successful backups remain                                                           | failure injection + built CLI E2E                                                       | PROVED |
| CLI-DOCTOR-001         | healthy installed project exits 0 with summary                                                                      | missing/malformed JSON, old core, missing locales and broken exports are actionable; help exits 0                                                                                           | read-only; rerun after repair                                                                                           | unit + built CLI E2E                                                                    | PROVED |

## Configuration Precedence

Client initial render uses `initialLanguage`, then manager default, then `en`.
After hydration without an explicit initial language: valid cookie, optional
localStorage, optional browser language, then configured default.

Server translation uses explicit `getTranslation()` options, then
`i18nexus.config.json`, then built-in defaults. Explicit language bypasses
header/cookie detection. Only JSON is auto-discovered.

Google Sheets commands use explicit CLI option, environment variable, JSON
config, then built-in default. Other CLI options use explicit flag, JSON
config, then command default.

## Error And Recovery Contract

- Public hooks reject/throw `Error`; exact prose is diagnostic, not semver-stable.
- Missing translations return a key/fallback rather than throwing.
- Existing empty-string translations remain empty.
- CLI success is exit 0 and controlled failure is exit 1; help is exit 0.
- Dry-run never authenticates, performs network requests, or writes.
- Server diagnostics may contain absolute paths and must not be returned to untrusted clients.
- Google diagnostics never serialize the original request object and redact secret-bearing messages.
- Download, sync-local, CSV import, generated locale index and cleanup writes are transactional as
  described above. Wrapper/extractor and remote upload are explicitly
  non-transactional; bidirectional sync cannot atomically commit remote and
  local systems together. Atomic locale targets reject duplicate paths,
  traversal and symbolic-link escapes. The journal is crash recovery, not an
  inter-process lock; serialize mutating commands for one locale root. Use
  version control/backup and rerun after repair.

## Verification Mapping

- Core client: `packages/core/src/__tests__/*.test.tsx`.
- Core server and URL: `accept-language.test.ts`, `cookie.test.ts`,
  `server-translations.test.ts`, `url.test.ts`, `exports.test.ts`.
- Tools: `packages/tools/scripts/**/*.test.ts` and active E2E/integration suites.
- Artifacts: core/tools packed-package smoke, React matrix, Node matrix, dist
  parity/reproducibility, browser bundle smoke, demo production build.

The test inventory contains no committed `describe.skip`, `it.skip`, or
`test.skip`. Live Google account acceptance and Windows remain explicit
environment decisions rather than hidden skipped tests.
