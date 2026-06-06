# Next.js App Router Robustness Evaluation

Date: 2026-06-01  
Repository under test: `i18n-global/i18n-mono`  
External app under test: `vercel/nextjs-postgres-nextauth-tailwindcss-template`  
Temporary app path: `/tmp/i18nexus-next-eval/app`

## 1. Goal

This evaluation checks whether `i18nexus` feels robust when used in a real Next.js App Router project, not only in isolated unit tests.

The main questions were:

- Can `packages/core` be installed from a real tarball and used in a Next 15 App Router app?
- Can `packages/tools` help migrate a realistic app instead of only toy examples?
- Do `I18nProvider`, `useTranslation`, `useLanguageSwitcher`, `getTranslation`, `i18n-wrapper`, `i18n-extractor`, `i18n-type`, and `i18n-doctor` work together as one product?
- Where does the current user experience break down?
- What should be fixed first before positioning `i18nexus-tools` as the recommended companion for `i18nexus` core?

## 2. Test Subject

The external app was `vercel/nextjs-postgres-nextauth-tailwindcss-template`.

It was selected because it is closer to a real user project than a blank app:

- Next.js App Router
- React 19
- Next 15
- Server Components and Client Components
- Auth middleware
- Dashboard layout
- Tailwind UI components
- Table/search/navigation strings
- A mix of page-level, layout-level, and component-level UI text

This gave us a useful surface area for testing both server and client translation flows.

## 3. Packages Tested

Local tarballs were created from the monorepo worktree:

- `packages/core` -> `i18nexus@4.0.0`
- `packages/tools` -> `i18nexus-tools@3.1.0`

The packages were installed into the temporary Next project with `pnpm add` from local `.tgz` files.

## 4. Commands Run

Baseline app validation:

```bash
pnpm install --frozen-lockfile
POSTGRES_URL='postgres://user:pass@localhost:5432/db' \
AUTH_SECRET='test-secret' \
AUTH_GITHUB_ID='test' \
AUTH_GITHUB_SECRET='test' \
pnpm build
```

Package validation:

```bash
npm pack --pack-destination /tmp/i18nexus-next-eval/packs
pnpm add /tmp/i18nexus-next-eval/packs/i18nexus-4.0.0.tgz
pnpm add /tmp/i18nexus-next-eval/packs/i18nexus-tools-3.1.0.tgz
```

Tools validation:

```bash
pnpm exec i18n-wrapper --help
pnpm exec i18n-wrapper -p 'app/(dashboard)/products-table.tsx'
pnpm exec i18n-extractor --static-key-extraction safe
pnpm exec i18n-type
pnpm exec i18n-doctor
```

App validation after integration:

```bash
pnpm exec tsc --noEmit
POSTGRES_URL='postgres://user:pass@localhost:5432/db' \
AUTH_SECRET='test-secret' \
AUTH_GITHUB_ID='test' \
AUTH_GITHUB_SECRET='test' \
pnpm build
```

Runtime validation:

```bash
POSTGRES_URL='postgres://user:pass@localhost:5432/db' \
AUTH_SECRET='test-secret' \
AUTH_GITHUB_ID='test' \
AUTH_GITHUB_SECRET='test' \
pnpm dev --port 3018
```

Browser routes checked:

- `http://localhost:3018/login`
- `http://localhost:3018/customers`

## 5. Manual Integration Applied To The Test App

The test app was manually wired to exercise both core and tools.

Added a client provider wrapper:

```tsx
"use client";

import { I18nProvider } from "i18nexus";
import { fallbackNamespace, loadNamespace } from "@/locales";

const availableLanguages = [
  { code: "en", name: "English" },
  { code: "ko", name: "한국어" },
];

export function I18nClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider
      loadNamespace={loadNamespace}
      fallbackNamespace={fallbackNamespace}
      languageManagerOptions={{
        defaultLanguage: "en",
        availableLanguages,
        enableAutoDetection: false,
      }}
    >
      {children}
    </I18nProvider>
  );
}
```

Added a language switcher using `useLanguageSwitcher`:

```tsx
"use client";

import { useLanguageSwitcher } from "i18nexus";

export function LanguageSwitcher() {
  const { availableLanguages, changeLanguage, currentLanguage, isLoading } =
    useLanguageSwitcher();

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1 text-xs">
      {availableLanguages.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => changeLanguage(language.code)}
          disabled={isLoading || currentLanguage === language.code}
        >
          {language.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

Used server translations in Server Components:

```tsx
import { getTranslation } from "i18nexus/server";

export default async function DashboardPage() {
  const { t } = await getTranslation("common");

  return <h1>{t("Products")}</h1>;
}
```

Used client translations in Client Components:

```tsx
"use client";

import { useTranslation } from "i18nexus";

export function SearchInput() {
  const { t } = useTranslation("common");

  return <input placeholder={t("Search...")} />;
}
```

## 6. What Worked Well

### 6.1 Core client runtime works

`I18nProvider`, `useTranslation`, lazy namespace loading, and `useLanguageSwitcher` worked in Client Components.

When the language changed from `en` to `ko`, client-rendered text such as the search placeholder changed immediately after the namespace was available.

### 6.2 Server translation works after TypeScript configuration is compatible

`getTranslation('common')` worked in Next App Router Server Components after the project switched to modern TypeScript module resolution.

Required change:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

This is expected for package `exports` subpaths such as `i18nexus/server`, but the requirement is not obvious to users.

### 6.3 Generated locale entrypoint is directionally correct

`i18n-extractor` generated a `locales/index.ts` entrypoint compatible with core v4 concepts:

- `languages`
- `namespaces`
- `fallbackNamespace`
- `loadNamespace`
- typed `createI18n`
- generated `I18nProvider`
- generated `useTranslation`

This is the right product direction. Tools should generate the glue code that makes core easier to use.

### 6.4 Generated types are useful

`i18n-type` generated key unions and interpolation variable metadata.

Example interpolation key:

```text
Showing {{start}}-{{end}} of {{total}} products
```

The generated type detected variables:

- `start`
- `end`
- `total`

This is a meaningful advantage over untyped string lookup.

### 6.5 Cookie-based server language detection works on refresh

After changing the language on the client, refreshing the page made server-rendered navigation and breadcrumbs use the language from the cookie.

This confirms that the server and client can share language state through the existing cookie mechanism.

## 7. Main Findings

### P0. Core tarballs can ship stale `dist`

The first `npm pack` of `packages/core` produced a package where the generated app entrypoint failed:

```text
Module '"i18nexus"' has no exported member 'createI18n'.
```

The source had the export, but the packed `dist` was stale. Running `npm run build` before `npm pack` fixed the package.

Root cause:

- `packages/core/package.json` has `prepublishOnly`.
- It does not have `prepack` or `prepare`.
- `npm pack` can therefore package stale build output.

Why this matters:

- Users install published tarballs, not source files.
- Tools now generate code that imports `createI18n` from the root package.
- If the tarball is stale, tools and core appear incompatible even when source code is correct.

Recommended fix:

- Add `prepack` to `packages/core`.
- Add tarball smoke tests in CI.
- Smoke-test root, server, and devtools subpath imports from a packed package.
- Smoke-test a generated `locales/index.ts` against the packed package.

### P0. Extractor assumes Korean source text even when `defaultLanguage` is English

The tested app is English-source and used:

```json
{
  "languages": ["en", "ko"],
  "defaultLanguage": "en"
}
```

But the extractor generated:

- `locales/common/en.json` with empty values
- `locales/common/ko.json` with source English text

This is backwards for English-source projects.

Expected behavior:

- Source strings should populate the configured source/default language.
- Non-source languages should start empty or follow a configured fill strategy.

Recommended fix:

- Add explicit `sourceLanguage` or make `defaultLanguage` drive source fill behavior.
- Support fill strategies such as `source`, `empty`, or `key`.
- Update CSV generation, JSON generation, tests, and docs.

### P1. `i18n-wrapper` does not wrap English app strings

`i18n-wrapper --help` suggests Korean/English wrapping support, but the current AST transformer only matches Korean text with a Korean regex.

In the English-source Next dashboard, running the wrapper against real files did not produce useful changes.

Why this matters:

- Many Next apps start in English.
- If the wrapper no-ops on English projects, the migration story is much weaker.
- The tool behavior and CLI copy do not match.

Recommended fix:

- Add source-language-aware wrapping.
- Support `--source-language en`, `--source-language ko`, and `--source-language auto`.
- Make English wrapping conservative enough to avoid wrapping IDs, URLs, class names, object keys, and technical constants.
- Update help text if English wrapping is intentionally out of scope.

### P1. Next App Router server/client language switching needs an official recipe

Client Components update immediately when `changeLanguage` is called.

Server Components do not automatically re-render in response to client state. They update after navigation, refresh, or `router.refresh()` if the language cookie has changed.

Observed behavior:

- Clicking `KO` changed the client search placeholder immediately.
- Server-rendered nav and breadcrumbs stayed English until refresh.
- After refresh, server text became Korean.

This is expected React/Next behavior, but it can look like an i18nexus bug.

Recommended fix:

- Document an App Router `LanguageSwitcher` that calls `router.refresh()` after `changeLanguage`.
- Consider generating this switcher from tools.
- Document when to use server `getTranslation` vs client `useTranslation`.
- Make the recommended provider setup avoid `initialLanguage="en"` unless the server also passes that language intentionally.

### P1. `i18nexus/server` needs TypeScript module resolution guidance

The test app had:

```json
{
  "compilerOptions": {
    "moduleResolution": "node"
  }
}
```

TypeScript could not resolve `i18nexus/server`:

```text
Cannot find module 'i18nexus/server' or its corresponding type declarations.
There are types at 'node_modules/i18nexus/dist/utils/server.d.ts', but this result could not be resolved under your current 'moduleResolution' setting.
Consider updating to 'node16', 'nodenext', or 'bundler'.
```

Changing to `moduleResolution: "bundler"` fixed it.

Recommended fix:

- Add this requirement to Next App Router docs.
- Make `i18n-doctor` detect incompatible `tsconfig.json` settings.
- Consider printing an actionable warning when generated files import `i18nexus/server` or when docs instruct users to use it.

### P1. `i18nexus/server` creates a Next build warning

`next build` passed, but emitted this warning:

```text
Critical dependency: the request of a dependency is an expression

Import trace:
node_modules/i18nexus/dist/utils/server.js
app/(dashboard)/layout.tsx
```

The warning appears related to dynamic import behavior in server utilities, especially config loading by dynamic path.

Why this matters:

- Builds pass, but users may treat the warning as a production risk.
- Next bundlers are sensitive to dynamic imports in server code.
- A clean build is important for trust.

Recommended fix:

- Refactor server config loading to avoid expression-based dynamic imports where possible.
- Prefer JSON config loading in server runtime.
- Consider explicit server factory APIs that accept config/loaders instead of inferring with dynamic imports.
- Add a Next build smoke test to CI.

### P2. Typed `t` is strong, but prop passing is awkward

Generated module augmentation narrowed `t` keys correctly. However, passing `t` into child components typed as `(key: string) => string` failed because the typed function only accepts the generated key union.

Example issue:

```tsx
function DesktopNav({ t }: { t: (key: string) => string }) {
  return <span>{t("Dashboard")}</span>;
}
```

A typed `t` from `getTranslation('common')` is not assignable to `(key: string) => string`.

This is TypeScript behaving correctly, but users need a clear pattern.

Recommended fix:

- Generate helper types such as `AppTranslationFunction<NS>`.
- Document `type CommonT = Awaited<ReturnType<typeof getTranslation<'common'>>>['t'];` as a fallback pattern.
- Consider exporting namespace-specific helper types from generated `locales/index.ts`.

### P2. `i18n-doctor` is useful but not end-to-end enough

`i18n-doctor` reported:

```text
Core v4 companion setup looks healthy.
```

But before manual fixes, the app still failed TypeScript due to:

- incompatible `moduleResolution`
- stale core tarball export mismatch
- generated entrypoint depending on root `createI18n`

Recommended fix:

- Doctor should inspect `tsconfig.json` for subpath export compatibility.
- Doctor should verify the installed package has required exports.
- Doctor should optionally run a lightweight generated entrypoint type check.
- Doctor should report warnings separately from success.

## 8. Recommended Issue Split

| Priority | Area             | Issue                                                           |
| -------- | ---------------- | --------------------------------------------------------------- |
| P0       | core             | Add release artifact safety for packed core packages            |
| P0       | tools            | Respect English/default source language in extractor output     |
| P1       | tools            | Make wrapper source-language aware and support English projects |
| P1       | core/tools/docs  | Add official Next App Router language switching recipe          |
| P1       | core             | Clean up `i18nexus/server` TypeScript and bundler compatibility |
| P2       | tools            | Strengthen `i18n-doctor` with end-to-end checks                 |
| P2       | tools/core types | Improve typed `t` prop-passing DX with generated helper types   |

## 9. GitHub Issue Tracking

| Priority | Issue                                                                   | URL                                                  |
| -------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| P0       | Ensure core npm pack ships fresh dist artifacts                         | <https://github.com/i18n-global/i18n-mono/issues/22> |
| P0       | Respect source/default language when extractor initializes locale files | <https://github.com/i18n-global/i18n-mono/issues/23> |
| P1       | Make i18n-wrapper source-language aware for English projects            | <https://github.com/i18n-global/i18n-mono/issues/24> |
| P1       | Add official Next App Router server/client language switching recipe    | <https://github.com/i18n-global/i18n-mono/issues/25> |
| P1       | Improve i18nexus/server TypeScript and Next bundler compatibility       | <https://github.com/i18n-global/i18n-mono/issues/26> |
| P2       | Strengthen i18n-doctor with end-to-end project checks                   | <https://github.com/i18n-global/i18n-mono/issues/27> |
| P2       | Generate helper types for passing typed t through props                 | <https://github.com/i18n-global/i18n-mono/issues/28> |

## 10. Proposed Roadmap

### Phase 1: Trust the package artifact

Fix package correctness before adding more features.

- Add `prepack` to core.
- Add packed-package smoke tests.
- Verify root exports and subpath exports from the packed tarball.
- Verify generated tools output against the packed tarball.

### Phase 2: Make tools match real source languages

Fix the migration experience for English-source and Korean-source apps.

- Add `sourceLanguage` semantics.
- Update JSON and CSV generation.
- Update wrapper source text detection.
- Add English Next app fixture tests.

### Phase 3: Make Next App Router first-class

Turn the observed manual setup into a guided path.

- Add `nextjs-app-router` guide.
- Generate or document a `LanguageSwitcher` that calls `router.refresh()`.
- Document server/client boundaries.
- Add `moduleResolution: "bundler"` guidance.

### Phase 4: Make diagnosis actionable

Make `i18n-doctor` catch the actual issues users hit.

- Inspect `tsconfig.json`.
- Inspect package exports.
- Verify generated entrypoint type compatibility.
- Warn about missing App Router refresh behavior when server translation is detected.

### Phase 5: Improve advanced TypeScript ergonomics

Make generated types easier to use in component architectures.

- Generate reusable `t` function types.
- Add examples for passing `t` through props.
- Keep key narrowing while reducing TypeScript friction.

## 11. Final Assessment

`packages/core` is directionally solid and already works in a real Next App Router app once configured correctly.

The biggest product gap is not the translation lookup itself. The biggest gap is the end-to-end experience:

- package artifact safety
- source-language-aware extraction
- wrapper behavior matching CLI promises
- App Router server/client synchronization guidance
- doctor checks that catch real project failures

If those are addressed, `i18nexus-tools` can become the differentiator: not just a helper CLI, but the guided migration and maintenance layer that makes `i18nexus` feel reliable in real applications.
