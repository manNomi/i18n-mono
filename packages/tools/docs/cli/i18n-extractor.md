# i18n-extractor Command Reference

Complete reference for the `i18n-extractor` command.

## Overview

The `i18n-extractor` command extracts translation keys from `t()` function calls and generates/updates translation files for multiple languages.

In tools v3, the default JSON output is aligned with `i18nexus@4`:

- `locales/[namespace]/[language].json`
- `locales/index.ts` with `loadNamespace`, `fallbackNamespace`, and typed `createI18n`
- `locales/types/i18nexus.d.ts`

Use `--flat` only when you intentionally need the legacy `locales/en.json` and `locales/ko.json` layout.

## Basic Usage

```bash
npx i18n-extractor [options]
```

## Options

### `-p, --pattern <pattern>`

Specifies the glob pattern for source files to scan.

**Default:** `"src/**/*.{js,jsx,ts,tsx}"` (from config)

**Examples:**

```bash
# App Router
npx i18n-extractor -p "app/**/*.{ts,tsx}"

# Pages Router
npx i18n-extractor -p "pages/**/*.{ts,tsx}"

# Specific directory
npx i18n-extractor -p "src/features/**/*.tsx"
```

### `-o, --output <dir>` / `-d, --output-dir <dir>`

Specifies the output directory for translation files.

**Default:** `"./locales"` (from config)

**Examples:**

```bash
# Custom directory
npx i18n-extractor -o "./public/locales"

# App directory structure
npx i18n-extractor -d "./app/i18n/locales"
```

### `-l, --languages <langs>`

Comma-separated list of languages to generate.

**Default:** `"en,ko"` (from config)

**Examples:**

```bash
# Two languages
npx i18n-extractor -l "en,ko"

# Multiple languages
npx i18n-extractor -l "en,ko,ja,zh,es,fr"

# Single language
npx i18n-extractor -l "en"
```

### `--source-language <lang>`

Language file that should receive extracted source strings for new keys.

**Default:** `sourceLanguage` from config, or `defaultLanguage` when
`sourceLanguage` is omitted.

**Examples:**

```bash
# English-source app: put extracted source strings in en.json
npx i18n-extractor --source-language en

# Korean-source app: keep legacy Korean-source initialization
npx i18n-extractor --source-language ko
```

With `--source-language en`, a newly extracted key such as `t("Dashboard")`
initializes `en.json` with `"Dashboard"` and initializes target language files
such as `ko.json` with `""`.

### `--force`

Force mode - overwrites all existing translations.

**Default:** `false` (safe mode - only adds new keys)

**Usage:**

```bash
# Safe mode (default) - preserves existing translations
npx i18n-extractor

# Force mode - overwrites everything
npx i18n-extractor --force
```

**Behavior:**

**Safe Mode (Default):**

```json
// Existing en.json
{
  "안녕하세요": "Hello",
  "환영합니다": "Welcome"
}

// After extraction with new key "감사합니다"
{
  "안녕하세요": "Hello",      // Preserved
  "환영합니다": "Welcome",     // Preserved
  "감사합니다": ""             // New key added
}
```

**Force Mode:**

```json
// Existing en.json
{
  "안녕하세요": "Hello",
  "환영합니다": "Welcome"
}

// After extraction with --force
{
  "안녕하세요": "",            // Overwritten
  "환영합니다": "",            // Overwritten
  "감사합니다": ""             // New key added
}
```

### `--flat`

Use the legacy flat file layout instead of the core v4 namespace layout.

**Usage:**

```bash
npx i18n-extractor --flat
```

**Output:**

```
locales/
├── en.json
└── ko.json
```

### `--no-types`

Skip automatic type generation after extraction.

**Usage:**

```bash
npx i18n-extractor --no-types
```

### `--types-output <path>`

Write generated TypeScript declarations to a custom path.

**Usage:**

```bash
npx i18n-extractor --types-output src/i18n/generated.d.ts
```

### `--strict-types`

Fail type generation when a language file is missing keys or contains empty values.

**Usage:**

```bash
npx i18n-extractor --strict-types
```

### `--static-key-extraction <mode>`

Controls how aggressively the extractor resolves static constants passed to
`t(...)`.

**Default:** `"safe"`

**Modes:**

- `off`: extract direct literals only, for example `t("home.title")`.
- `safe`: extract direct literals, const string aliases, and explicit i18n key
  containers such as `I18N_KEYS` or `HOME_TRANSLATION_KEYS`.
- `aggressive`: extract any statically resolvable const object/array member.

**Usage:**

```bash
npx i18n-extractor --static-key-extraction safe
npx i18n-extractor --static-key-extraction aggressive
```

### `-f, --format csv`

Export translations as CSV format instead of JSON.

**Usage:**

```bash
npx i18n-extractor -f csv -o translations.csv
```

**Output:**

```csv
Key,English,Korean
안녕하세요,,안녕하세요
환영합니다,,환영합니다
감사합니다,,감사합니다
```

### `--dry-run`

Preview extraction without writing files.

**Usage:**

```bash
npx i18n-extractor --dry-run
```

**Output:**

- Shows keys that would be extracted
- Displays file paths
- Doesn't modify any files

### `-h, --help`

Display help information.

**Usage:**

```bash
npx i18n-extractor --help
```

## Extraction Process

### 1. Scans Source Files

Finds all `t()` function calls:

```tsx
// Source file
function Welcome() {
  const { t } = useTranslation("common");
  return (
    <div>
      <h1>{t("안녕하세요")}</h1>
      <p>{t("환영합니다")}</p>
    </div>
  );
}
```

### 2. Extracts Keys

Identifies translation keys:

- `"안녕하세요"`
- `"환영합니다"`

The extractor also resolves static constants according to
`staticKeyExtraction`. The default `safe` mode only follows values that are
clearly translation-key constants:

```tsx
const titleKey = "title";
const HOME_I18N_KEYS = {
  subtitle: "subtitle",
  cta: "cta",
} as const;
const NAV_I18N_KEYS = ["nav.home", "nav.settings"] as const;

function Home() {
  const { t } = useTranslation("home");

  return (
    <>
      {t(titleKey)}
      {t(HOME_I18N_KEYS.subtitle)}
      {NAV_I18N_KEYS.map((item) => (
        <span key={item}>{t(item)}</span>
      ))}
    </>
  );
}
```

General data objects are skipped in `safe` mode even when they are written as
const object literals:

```tsx
const response = {
  label: "home.title",
} as const;

t(response.label); // skipped in safe mode
```

Use `aggressive` only when your codebase intentionally stores translation keys
in general const objects. Dynamic values from functions, props, state, API data,
or arrays mixed with dynamic entries are always skipped to avoid false positives.

| Pattern                                 | safe | aggressive |
| --------------------------------------- | ---- | ---------- |
| `t("home.title")`                       | yes  | yes        |
| `const key = "home.title"; t(key)`      | yes  | yes        |
| `t(I18N_KEYS.title)`                    | yes  | yes        |
| `I18N_KEYS.map((key) => t(key))`        | yes  | yes        |
| `t(response.label)` from a const object | no   | yes        |
| `t(props.label)`                        | no   | no         |
| `t(getKey())`                           | no   | no         |
| ``t(`${namespace}.${key}`)``            | no   | no         |
| array with dynamic entries              | no   | no         |

### 3. Generates Translation Files

Creates or updates namespace language files:

```json
// locales/common/ko.json
{
  "안녕하세요": "안녕하세요",
  "환영합니다": "환영합니다"
}

// locales/common/en.json
{
  "안녕하세요": "",
  "환영합니다": ""
}
```

## Output Formats

### JSON Format (Default)

```json
{
  "key1": "value1",
  "key2": "value2"
}
```

**File Structure:**

```
locales/
├── common/
│   ├── en.json
│   ├── ko.json
│   └── ja.json
├── index.ts
└── types/
    └── i18nexus.d.ts
```

### CSV Format

```csv
Key,English,Korean,Japanese
key1,,value1,
key2,,value2,
```

**File:**

```
translations.csv
```

## Safe vs Force Mode

### Safe Mode (Default) - Recommended

**Use When:**

- Daily development
- Adding new features
- Incremental updates

**Behavior:**

- Reads existing translation files
- Preserves all existing translations
- Only adds new keys
- Safe and non-destructive

**Example:**

```bash
# Day 1: Initial translations
npx i18n-extractor
# Creates: { "안녕": "Hello" }

# Day 2: Add new feature
# Code has: t("안녕"), t("감사")
npx i18n-extractor
# Result: { "안녕": "Hello", "감사": "" }
# "Hello" is preserved!
```

### Force Mode - Use with Caution

**Use When:**

- Complete regeneration needed
- After major refactoring
- Fixing corrupted translations
- Local files are source of truth

**Behavior:**

- Ignores existing translations
- Overwrites all values
- Generates fresh files

**Example:**

```bash
# Before
# en.json: { "안녕": "Hello" }

# After force extraction
npx i18n-extractor --force
# en.json: { "안녕": "" }
# All translations reset!
```

## Language-Specific Behavior

### Korean (Default Language)

Keys are filled with Korean text:

```json
{
  "안녕하세요": "안녕하세요",
  "환영합니다": "환영합니다"
}
```

### English (Target Language)

Keys start empty (need translation):

```json
{
  "안녕하세요": "",
  "환영합니다": ""
}
```

### Additional Languages

All target languages start empty:

```json
// ja.json
{
  "안녕하세요": "",
  "환영합니다": ""
}

// zh.json
{
  "안녕하세요": "",
  "환영합니다": ""
}
```

## Workflow Examples

### Basic Workflow

```bash
# 1. Wrap strings
npx i18n-wrapper

# 2. Extract keys (safe mode)
npx i18n-extractor

# 3. Add translations manually
# Edit locales/[namespace]/en.json

# 4. Test application
npm run dev
```

### Force Regeneration

```bash
# 1. Preview what would change
npx i18n-extractor --force --dry-run

# 2. Backup existing translations
cp -r locales locales.backup

# 3. Force regeneration
npx i18n-extractor --force

# 4. Restore important translations
# Manually merge from backup
```

### Google Sheets Workflow

```bash
# 1. Extract to CSV
npx i18n-extractor -f csv -o translations.csv

# 2. Upload to Google Sheets
npx i18n-upload

# 3. Translators work in sheets

# 4. Download translations
npx i18n-download
```

### Multi-Language Setup

```bash
# Extract for all languages
npx i18n-extractor -l "en,ko,ja,zh,es,fr"

# Result:
# locales/common/en.json
# locales/common/ko.json
# locales/common/ja.json
# locales/common/zh.json
# locales/common/es.json
# locales/common/fr.json
# locales/index.ts
# locales/types/i18nexus.d.ts
```

## Configuration

The extractor reads from `i18nexus.config.json`:

```json
{
  "languages": ["en", "ko"],
  "localesDir": "./locales",
  "sourcePattern": "src/**/*.{ts,tsx}",
  "staticKeyExtraction": "safe",
  "staticKeyContainerPatterns": [
    "^I18N_KEYS$",
    "_I18N_KEYS$",
    "^TRANSLATION_KEYS$",
    "_TRANSLATION_KEYS$",
    "^translationKeys$",
    "TranslationKeys$"
  ]
}
```

**TypeScript Configuration:**

```typescript
// i18nexus.config.ts
export const config = defineConfig({
  languages: ["en", "ko", "ja"] as const,
  localesDir: "./locales",
  sourcePattern: "app/**/*.{ts,tsx}",
});
```

## Advanced Features

### Interpolation Support

Extracts keys with interpolation:

```tsx
// Source
t("사용자: {{count}}명", { count });

// Extracted key
("사용자: {{count}}명");
```

### Namespace Support

```tsx
// Source
t("common:안녕하세요");

// Extracted to
// locales/common/ko.json
```

### Nested Keys

```tsx
// Source
t("user.profile.name")

// Extracted as
{
  "user.profile.name": "user.profile.name"
}
```

## Error Handling

### Duplicate Keys

```bash
⚠️ Duplicate key found: "안녕하세요"
  - File 1: src/components/Welcome.tsx:10
  - File 2: src/components/Header.tsx:5
```

**Solution:** Keys are automatically merged.

### Invalid Keys

```bash
❌ Invalid key format: ""
Skipping empty key...
```

**Solution:** Ensure keys are non-empty strings.

### File Write Errors

```bash
❌ Failed to write: locales/common/en.json
Permission denied
```

**Solution:** Check directory permissions.

## Best Practices

### 1. Use Safe Mode Daily

```bash
# Daily development
npx i18n-extractor
```

### 2. Preview Before Force

```bash
# Before force mode
npx i18n-extractor --force --dry-run
```

### 3. Backup Translations

```bash
# Before major changes
cp -r locales locales.backup
npx i18n-extractor --force
```

### 4. Version Control

```bash
# Commit before extraction
git add .
git commit -m "Before extraction"
npx i18n-extractor
git diff  # Review changes
```

### 5. Regular Cleanup

```bash
# Remove unused keys
npx i18n-clean-legacy

# Then extract fresh
npx i18n-extractor
```

## Troubleshooting

### Issue: Keys Not Extracted

**Symptoms:**

- `t()` calls not found
- Empty output files

**Solutions:**

1. Check file pattern matches your files
2. Verify `t()` syntax is correct
3. Ensure files are saved

```bash
# Debug with dry-run
npx i18n-extractor --dry-run
```

### Issue: Translations Overwritten

**Symptoms:**

- Existing translations lost
- All values reset to empty

**Solutions:**

1. Use safe mode (don't use `--force`)
2. Restore from backup
3. Use version control

```bash
# Safe mode (default)
npx i18n-extractor
```

### Issue: Wrong Language Values

**Symptoms:**

- Korean appears in English file
- Languages mixed up

**Solutions:**

1. Check `sourceLanguage` and `defaultLanguage` in config
2. Verify language codes
3. Re-extract with correct config

```json
{
  "defaultLanguage": "ko",
  "sourceLanguage": "ko",
  "languages": ["en", "ko"]
}
```

## Performance

### Large Codebases

```bash
# Process specific directories
npx i18n-extractor -p "src/features/auth/**/*.tsx"

# Then merge with main extraction
npx i18n-extractor
```

### Optimization Tips

1. Use specific patterns
2. Exclude test files
3. Regular cleanup of unused keys

## Output Examples

### Console Output

```bash
$ npx i18n-extractor

🔍 Scanning files: src/**/*.{ts,tsx}
📝 Found 150 translation keys

📁 Writing translation files:
✅ locales/common/ko.json (150 keys)
✅ locales/common/en.json (150 keys, 45 new)
✅ locales/index.ts
✅ locales/types/i18nexus.d.ts

📊 Summary:
- Total keys: 150
- New keys: 45
- Updated keys: 0
- Preserved translations: 105
```

### Generated Files

**locales/common/ko.json:**

```json
{
  "안녕하세요": "안녕하세요",
  "환영합니다": "환영합니다",
  "감사합니다": "감사합니다"
}
```

**locales/common/en.json:**

```json
{
  "안녕하세요": "Hello",
  "환영합니다": "Welcome",
  "감사합니다": ""
}
```

## See Also

- [i18n-wrapper](./i18n-wrapper.md) - Wrap strings with t()
- [i18n-clean-legacy](./i18n-clean-legacy.md) - Clean unused keys
- [i18n-upload](./i18n-upload.md) - Upload to Google Sheets
- [Getting Started](../guides/getting-started.md) - Complete workflow
