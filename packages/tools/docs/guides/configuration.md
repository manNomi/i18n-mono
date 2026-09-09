# Configuration Guide

Complete reference for configuring i18nexus-tools for your project.

## 📁 Configuration Files

i18nexus-tools automatically discovers one configuration format:

1. **JSON** (`i18nexus.config.json`) - Required for automatic discovery

### File Priority

JavaScript and TypeScript config files are not executed or imported. This keeps
CLI and `i18nexus/server` behavior aligned and avoids runtime-loader ambiguity.

```
i18nexus.config.json
```

## 🔧 Configuration Options

### Basic Configuration

```json
{
  "languages": ["en", "ko"],
  "defaultLanguage": "ko",
  "sourceLanguage": "ko",
  "localesDir": "./locales",
  "sourcePattern": "src/**/*.{js,jsx,ts,tsx}",
  "translationImportSource": "i18nexus",
  "staticKeyExtraction": "safe",
  "mode": "server",
  "serverTranslationFunction": "getTranslation",
  "googleSheets": {
    "spreadsheetId": "",
    "credentialsPath": "./credentials.json",
    "sheetName": "Translations"
  }
}
```

### Typed In-Code Configuration

`defineConfig` can type an object imported directly by application code, but it
does not make a `.ts` file discoverable by the CLI or server entrypoint.

```typescript
import { defineConfig } from "i18nexus";

export const config = defineConfig({
  languages: ["en", "ko"] as const,
  defaultLanguage: "ko",
  sourceLanguage: "ko",
  localesDir: "./locales",
  sourcePattern: "src/**/*.{ts,tsx,js,jsx}",
  translationImportSource: "i18nexus",
});

export type AppLanguages = (typeof config.languages)[number];
```

## 📋 Configuration Reference

### Core Settings

#### `languages`

- **Type**: `string[]`
- **Default**: `["en", "ko"]`
- **Description**: List of supported languages
- **Example**: `["en", "ko", "ja", "zh"]`

#### `defaultLanguage`

- **Type**: `string`
- **Default**: `"ko"`
- **Description**: Default language code
- **Example**: `"en"`

#### `sourceLanguage`

- **Type**: `string`
- **Default**: `defaultLanguage`
- **Description**: Language file that receives extracted source strings when `i18n-extractor` adds new keys
- **Example**: `"en"` for English-source apps
- **Note**: Target languages start with empty values unless they already have translations. For example, with `sourceLanguage: "en"`, new keys fill `en.json` and leave `ko.json` empty.

#### `localesDir`

- **Type**: `string`
- **Default**: `"./locales"`
- **Description**: Directory for translation files
- **Example**: `"./public/locales"`

#### `sourcePattern`

- **Type**: `string`
- **Default**: `"src/**/*.{js,jsx,ts,tsx}"`
- **Description**: Glob pattern for source files
- **Examples**:
  - `"app/**/*.{ts,tsx}"` - Next.js App Router
  - `"pages/**/*.{ts,tsx}"` - Next.js Pages Router
  - `"components/**/*.{js,jsx}"` - Components only

#### `translationImportSource`

- **Type**: `string`
- **Default**: `"i18nexus"`
- **Description**: Import source for translation functions
- **Examples**:
  - `"i18nexus"` - Default
  - `"react-i18next"` - Direct react-i18next
  - `"@/lib/i18n"` - Custom path

#### `staticKeyExtraction`

- **Type**: `"off" | "safe" | "aggressive"`
- **Default**: `"safe"`
- **Description**: Controls how strongly `i18n-extractor` resolves static constants passed to `t(...)`
- **Examples**:
  - `"off"` - Extract direct literals only, such as `t("home.title")`
  - `"safe"` - Extract direct literals, const string aliases, and explicit i18n key containers
  - `"aggressive"` - Extract any statically resolvable const object/array member

#### `staticKeyContainerPatterns`

- **Type**: `string[]`
- **Default**: `["^I18N_KEYS$", "_I18N_KEYS$", "^TRANSLATION_KEYS$", "_TRANSLATION_KEYS$", "^translationKeys$", "TranslationKeys$"]`
- **Description**: Regex patterns for object/array constant names that are allowed in `staticKeyExtraction: "safe"` mode
- **Examples**:
  - `["Keys$"]` - Allow names like `navKeys`
  - `["^APP_I18N_"]` - Allow names prefixed with `APP_I18N_`

### Google Sheets Settings

#### `googleSheets.spreadsheetId`

- **Type**: `string`
- **Default**: `""`
- **Description**: Google Spreadsheet ID
- **Example**: `"1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"`

#### `googleSheets.credentialsPath`

- **Type**: `string`
- **Default**: `"./credentials.json"`
- **Description**: Path to Google service account credentials
- **Example**: `"./config/google-credentials.json"`

#### `googleSheets.sheetName`

- **Type**: `string`
- **Default**: `"Translations"`
- **Description**: Worksheet name in Google Sheets
- **Example**: `"App Translations"`

## 🎯 Framework-Specific Configurations

### Next.js App Router

```json
{
  "languages": ["en", "ko"],
  "defaultLanguage": "ko",
  "localesDir": "./locales",
  "sourcePattern": "app/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus",
  "staticKeyExtraction": "safe"
}
```

### Next.js Pages Router

```json
{
  "languages": ["en", "ko"],
  "defaultLanguage": "ko",
  "localesDir": "./public/locales",
  "sourcePattern": "pages/**/*.{ts,tsx}",
  "translationImportSource": "react-i18next"
}
```

### React (Create React App)

```json
{
  "languages": ["en", "ko"],
  "defaultLanguage": "ko",
  "localesDir": "./public/locales",
  "sourcePattern": "src/**/*.{js,jsx,ts,tsx}",
  "translationImportSource": "react-i18next"
}
```

### Vite + React

```json
{
  "languages": ["en", "ko"],
  "defaultLanguage": "ko",
  "localesDir": "./src/locales",
  "sourcePattern": "src/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus"
}
```

## 🔧 Advanced Configuration

### Custom Import Sources

```json
{
  "translationImportSource": "@/lib/i18n"
}
```

### Multiple Language Sets

```json
{
  "languages": ["en", "ko", "ja", "zh", "es", "fr"],
  "defaultLanguage": "en"
}
```

### Custom File Patterns

```json
{
  "sourcePattern": "src/{components,pages,hooks}/**/*.{ts,tsx}"
}
```

### Environment-Specific Configurations

Keep non-secret defaults in JSON and override connection values in the shell.
`i18n-sheets` Google Sheets subcommands and `i18n-upload` use the precedence
CLI option > environment variable > JSON config > built-in default.

```json
{
  "googleSheets": {
    "spreadsheetId": "",
    "credentialsPath": "./credentials.json",
    "sheetName": "Translations"
  }
}
```

```bash
GOOGLE_SPREADSHEET_ID=production-sheet-id \
GOOGLE_CREDENTIALS_PATH=/run/secrets/google.json \
npx i18n-sheets status
```

## 🚀 Initialization Commands

### Basic Initialization

```bash
# JSON configuration
npx i18n-sheets init

# Deprecated compatibility flag; warns and still creates JSON
npx i18n-sheets init --typescript

# Custom languages
npx i18n-sheets init --languages "en,ko,ja"

# Custom locales directory
npx i18n-sheets init -l "./public/locales"

# With Google Sheets
npx i18n-sheets init -s <spreadsheet-id> -c ./credentials.json
```

### Advanced Initialization

```bash
# Full configuration
npx i18n-sheets init \
  --languages "en,ko,ja,zh" \
  --locales "./src/locales" \
  --spreadsheet <spreadsheet-id> \
  --credentials "./config/google-credentials.json"
```

## 🔍 Configuration Validation

### Check Configuration

```bash
# Validate local package/config/locale compatibility without network access
npx i18n-doctor

# Test with specific config
npx i18n-wrapper --dry-run
```

### Common Validation Errors

#### Invalid Language Codes

```json
{
  "languages": ["english", "korean"]
}
```

Invalid for this example because names, rather than language codes, are used.

```json
{
  "languages": ["en", "ko"]
}
```

#### Invalid File Patterns

```json
{
  "sourcePattern": "src/*.ts"
}
```

This pattern scans only top-level TypeScript files.

```json
{
  "sourcePattern": "src/**/*.{ts,tsx}"
}
```

#### Missing Google Sheets Config

```json
{
  "googleSheets": {
    "spreadsheetId": ""
  }
}
```

An empty ID is valid for local-only workflows, but Google Sheets commands
require an ID from a CLI option, environment variable, or this field.

## 🔄 Configuration Migration

### From v1.4.0 to v1.5.0+

Old configuration:

```json
{
  "localesDir": "./locales/en/common.json"
}
```

New configuration:

```json
{
  "localesDir": "./locales"
}
```

### From JavaScript or TypeScript to JSON

Move serializable values into `i18nexus.config.json`. JavaScript expressions,
imports, and environment reads are not evaluated during automatic discovery;
use CLI options or the documented environment variables for runtime overrides.

## 🎨 Best Practices

### Configuration Organization

```json
{
  "languages": ["en", "ko"],
  "defaultLanguage": "ko",
  "localesDir": "./locales",
  "sourcePattern": "src/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus",
  "staticKeyExtraction": "safe",
  "googleSheets": {
    "spreadsheetId": "",
    "credentialsPath": "./credentials.json",
    "sheetName": "Translations"
  }
}
```

### Environment Variables

```bash
# Export in the current shell or configure the variables in CI.
export GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
export GOOGLE_CREDENTIALS_PATH=./credentials.json
```

### Type Safety

```typescript
import type { AppLanguages } from "./types/i18n";

const { changeLanguage } = useLanguageSwitcher<AppLanguages>();
```

## 🆘 Troubleshooting

### Configuration Not Found

```bash
# Check current directory
pwd

# Check the automatically discovered file
ls -la i18nexus.config.json

# Initialize if missing
npx i18n-sheets init
```

### Invalid Configuration

```bash
# Validate JSON
cat i18nexus.config.json | jq .

# Run the package-aware diagnostic
npx i18n-doctor
```

### Google Sheets Issues

```bash
# Test connection
npx i18n-sheets status -s <spreadsheet-id>

# Check credentials
ls -la credentials.json
```

## 📚 Next Steps

- [Getting Started Guide](./getting-started.md)
- [Google Sheets Integration](./google-sheets.md)
- [Type Safety Guide](./advanced/type-safety.md)
- [Custom Patterns Guide](./advanced/custom-patterns.md)
