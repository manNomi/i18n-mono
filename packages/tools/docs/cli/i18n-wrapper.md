# i18n-wrapper Command Reference

`i18n-wrapper` updates React components by wrapping supported source text with
`t()` and adding the required translation binding. Use the standard command for
normal projects. `i18n-wrapper-swc` and `i18n-wrapper-swc-worker` accept the
same transformation options for projects that use those execution paths.

## Usage

```bash
npx i18n-wrapper [options]
```

| Option                        | Description                                                         |
| ----------------------------- | ------------------------------------------------------------------- |
| `-p, --pattern <pattern>`     | Source glob pattern. Defaults to `sourcePattern` in config.         |
| `--source-language <lang>`    | Source text detection: `ko`, `en`, or `auto`.                       |
| `--key-first`                 | Enable key-first JSX conversion with the config or default pattern. |
| `--key-first-pattern <regex>` | Enable key-first conversion with a one-run custom pattern.          |
| `--no-key-first`              | Disable key-first conversion for this run.                          |
| `-h, --help`                  | Show supported options.                                             |

The wrapper does not provide `--dry-run` or `--verbose`. Start with a narrow
glob and inspect `git diff` before widening the scope.

```bash
npx i18n-wrapper -p "app/about/page.tsx"
git diff -- app/about/page.tsx
```

## Source Text Mode

By default, the wrapper detects Korean source text. Configure
`sourceLanguage: "en"` for conservative English UI text, or `"auto"` for both.
It preserves existing `t()` calls and skips imports and object property keys.

```bash
npx i18n-wrapper --source-language en -p "app/**/*.tsx"
```

## Key-first JSX Mode

Key-first is an opt-in mode for pages written with translation keys from the
start.

```tsx
// Before
<h1>about.title1</h1>

// After
<h1>{t("about.title1")}</h1>
```

Enable it in `i18nexus.config.json`:

```json
{
  "keyFirst": {
    "enabled": true
  }
}
```

The default pattern is:

```text
[a-z][A-Za-z0-9_-]*(?:\.[a-z][A-Za-z0-9_-]*)+
```

It is matched against the entire value. Use a custom pattern when a project has
a narrower key convention:

```bash
npx i18n-wrapper --key-first-pattern "feature\\.[a-zA-Z0-9_.-]+"
```

Key-first only transforms JSX text, direct JSX string expressions, and
user-facing attributes: `alt`, `aria-description`, `aria-label`,
`aria-roledescription`, `label`, `placeholder`, and `title`. It does not infer
keys from variables, API data, object/array constants, or dynamic template
literals. It skips `code`, `pre`, `script`, and `style` descendants, technical
attributes such as `className` and `href`, `i18n-ignore` nodes, and existing
`t()` calls.

The default dotted-key pattern can also match visible domain-like text such as
`example.com`. Mark intentional display text with `i18n-ignore` or configure a
narrower `keyFirst.pattern` to avoid that conversion.

## Namespace and Locale Workflow

The wrapper uses configured namespace inference to select a `useTranslation`
binding. A namespace-qualified key is never split or rewritten.

```tsx
const { t } = useTranslation("about");

return <h1>{t("about.title1")}</h1>;
```

Run the extractor after wrapping:

```bash
npx i18n-extractor -p "app/about/page.tsx"
```

With `namespaceLocation: "app"` and `sourceLanguage: "ko"`, this produces:

```json
// locales/about/ko.json
{ "about.title1": "about.title1" }

// locales/about/en.json
{ "about.title1": "" }
```

Locale values are intentionally user-owned. Replace the source placeholder and
add target translations in your normal translation workflow.

## Next.js App Router

Configure the component mode in `i18nexus.config.json`; it is not a wrapper CLI
option.

```json
{
  "framework": "nextjs",
  "mode": "server",
  "namespaceLocation": "app",
  "keyFirst": { "enabled": true }
}
```

`mode: "server"` creates an async `getTranslation()` binding from
`i18nexus/server`. `mode: "client"` with `framework: "nextjs"` adds the
`"use client"` directive and a `useTranslation()` binding.
