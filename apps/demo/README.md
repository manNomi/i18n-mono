# i18nexus Demo Development

This demo intentionally consumes the local workspace packages:

- `i18nexus` from `../../packages/core`
- `i18nexus-tools` from `../../packages/tools`

## Safe Local Workflow

Run the demo through the package scripts instead of calling Next.js directly:

```bash
npm --workspace i18nexus-demo run dev
npm --workspace i18nexus-demo run build
```

The demo scripts build and smoke-test the local packages first. This prevents
stale `packages/core/dist` output from breaking imports such as
`i18nexus/devtools` or leaving removed v4 exports in the package root.

If you intentionally want to skip local package builds while iterating, set:

```bash
I18NEXUS_DEMO_SKIP_LOCAL_PACKAGE_BUILD=1 npm --workspace i18nexus-demo run dev
```

## Do Not Build While Dev Server Is Running

`next dev` and `next build` share `.next` output. Running a production build
while the dev server is alive can leave the dev server with missing chunks.
Stop the dev server before building, or explicitly opt out of the guard:

```bash
I18NEXUS_DEMO_ALLOW_ACTIVE_SERVER=1 npm --workspace i18nexus-demo run build
```

## Namespace And Type Workflow

When adding a namespace:

1. Add `locales/<namespace>/en.json` and `locales/<namespace>/ko.json`.
2. Use `useTranslation("<namespace>")` in the page or component.
3. Regenerate namespace/key types:

```bash
npm --workspace i18nexus-demo run i18n:type
```

Use this check before committing generated type changes:

```bash
npm --workspace i18nexus-demo run i18n:check
```

## Devtools

Mount devtools once near the provider in `app/ClientProvider.tsx`. Keep the
subpath import behind a dev-only dynamic import so production bundles stay
focused on the runtime API:

```tsx
import dynamic from "next/dynamic";

const I18NexusDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : dynamic(
        () =>
          import("i18nexus/devtools").then((module) => module.I18NexusDevtools),
        { ssr: false },
      );

<I18nProvider>
  {children}
  <I18NexusDevtools position="bottom-right" />
</I18nProvider>;
```

This keeps consumer pages focused on `useTranslation` while still giving the
whole app access to the same language and lazy namespace debugging state.
