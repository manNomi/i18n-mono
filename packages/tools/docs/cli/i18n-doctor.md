# i18n-doctor

`i18n-doctor` checks whether a project is aligned with `i18nexus@4` and the
tools v3 generated workflow.

```bash
npx i18n-doctor
```

## What It Checks

- `i18nexus` core dependency is installed and compatible with v4
- installed `i18nexus` package exports include root, `i18nexus/server`, and
  `i18nexus/devtools`
- generated locale entrypoints that import `createI18n` are compatible with the
  installed root export
- `translationImportSource` is set to `i18nexus`
- `tsconfig.json` uses modern package export resolution when server utilities
  are detected
- `localesDir` exists
- fallback namespace exists
- `locales/index.ts` exists for the generated core v4 runtime entrypoint
- `locales/types/i18nexus.d.ts` exists for generated type safety
- translations do not have missing or empty values

## Recommended Flow

```bash
npx i18n-wrapper
npx i18n-extractor
npx i18n-doctor
```

`i18n-extractor` now generates both `locales/index.ts` and
`locales/types/i18nexus.d.ts` by default, so `i18n-doctor` is designed as the
last confidence check before commit, CI, or release.

## Exit Codes

- `0`: no blocking errors
- `1`: blocking errors found

Warnings are printed but do not fail the command.

Doctor reports one of three statuses:

- `healthy`: no findings
- `warning`: no blocking errors, but setup should be adjusted
- `failed`: at least one blocking error

For Next.js App Router projects using `i18nexus/server`, a common warning is
legacy TypeScript module resolution. Use:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```
