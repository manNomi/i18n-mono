# 🛠️ i18nexus-tools

> The core v4 companion CLI for i18nexus: wrap code, extract namespaces, generate typed runtime entrypoints, diagnose setup health, and sync translations.

[English](./README.md) | [한국어](./README.ko.md)

[![NPM Version](https://img.shields.io/npm/v/i18nexus-tools)](https://www.npmjs.com/package/i18nexus-tools)
[![NPM Downloads](https://img.shields.io/npm/dm/i18nexus-tools)](https://www.npmjs.com/package/i18nexus-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

### 🔍 Auto Extract Translation Keys

- Automatically detect translation keys in codebase
- Find unused translation keys
- Detect missing translations across languages
- Support for namespace-based organization

### 🔄 Google Sheets Integration

- Upload translations to Google Sheets
- Download translations from Google Sheets
- Bidirectional synchronization
- Automatic formula escaping for special characters

### 🤖 Code Transformation

- Auto-wrap hardcoded text with `t()` function
- Automatically inject `useTranslation` hooks
- Support for both Babel and SWC
- Type-safe transformations

### 📊 TypeScript Type Generation

- Generate types from translation files
- Auto-run after extraction by default
- Generate `I18nexusGeneratedTranslations` for `createI18n`
- Module augmentation for `i18nexus` and `i18nexus/server`
- Namespace-specific key exports with fallback namespace support

### 🩺 Core v4 Doctor

- Validate that your project is ready for `i18nexus@4`
- Check `locales/index.ts`, generated types, fallback namespace, and translation completeness
- Catch old core versions before publishing or deploying

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g i18nexus-tools
```

### Per-Project Installation

```bash
npm install --save-dev i18nexus-tools
```

## 🚀 Quick Start

### 1. Create Configuration File

You can create `i18nexus.config.json` manually or use the init command:

```bash
npx i18n-sheets init
```

This interactive command will:

- Ask if you want namespace separation (separate files vs single file)
- Create `common` and `constant` namespaces with sample data
- Generate `i18nexus.config.json` with recommended settings
- Guide you through Google Sheets credentials setup (optional)

**Manual Configuration:**

Create `i18nexus.config.json` in your project root:

```json
{
  "sourcePattern": "src/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus",
  "languages": ["en", "ko"],
  "defaultLanguage": "en",
  "sourceLanguage": "en",
  "localesDir": "./locales",
  "fallbackNamespace": "common",
  "useNamespaceStructure": true,
  "googleSheets": {
    "spreadsheetId": "your-spreadsheet-id",
    "credentialsPath": "./credentials.json"
  }
}
```

### 2. Basic Workflow

```bash
# 1. Auto-wrap hardcoded text
npx i18n-wrapper -p "src/**/*.tsx"

# 2. Extract translation keys
#    This now also generates locales/index.ts and locales/types/i18nexus.d.ts
npx i18n-extractor

# 3. Validate core v4 setup
npx i18n-doctor

# Optional: regenerate TypeScript types only
npx i18n-type

# 4. Upload to Google Sheets
npx i18n-upload --spreadsheet-id "your-id"

# 5. Translate in Google Sheets...

# 6. Download translations
npx i18n-download
```

## 📋 CLI Commands

### `i18n-extractor`

Extract translation keys from code, update locale JSON files, generate a core v4 locale entrypoint, and generate TypeScript types.

```bash
i18n-extractor [options]

Options:
  -p, --pattern <pattern>     Source file pattern
  -d, --output-dir <dir>      Output directory
  -f, --format <format>       Output format: json|csv
  -l, --languages <langs>     Comma-separated languages
  --source-language <lang>     Language that receives extracted source text
  --flat                      Use legacy flat files (locales/en.json)
  --no-types                  Skip automatic type generation
  --types-output <path>       Custom generated type output path
  --strict-types              Fail type generation on missing/empty translations
  --static-key-extraction <mode>
                              Static constant extraction: off|safe|aggressive
  -h, --help                  Display help
```

**Features:**

- Scans codebase for `t()` function calls
- Resolves static constants with explicit safety modes (`off`, `safe`, `aggressive`)
- In default `safe` mode, follows const strings and clear i18n key containers such as `I18N_KEYS`, while skipping general data objects like API responses
- Extracts translation keys and variables
- Generates `locales/index.ts` with `loadNamespace`, `fallbackNamespace`, and typed `createI18n`
- Generates `locales/types/i18nexus.d.ts` by default
- Creates namespace-specific types (`CommonKeys`, `ConstantKeys`, etc.)
- Creates prop-friendly `t` helper types such as `AppTranslationFunction`
- Detects unused and missing translations

**Example:**

```bash
# Basic extraction
npx i18n-extractor

# With verbose output
npx i18n-extractor -v

# Custom pattern
npx i18n-extractor -p "app/**/*.{ts,tsx}"

# Skip automatic type generation
npx i18n-extractor --no-types

# Legacy flat output
npx i18n-extractor --flat
```

**Output:**

```
✅ Generated core v4 locale entrypoint
📝 Generating TypeScript type definitions...
✅ Generated type definitions at: locales/types/i18nexus.d.ts
   - 21 namespaces
   - 1039 total keys
   - 5 keys with interpolation variables
```

Generated `locales/index.ts` can be used in two ways:

```tsx
// Beginner API
import { I18nProvider } from "i18nexus";
import { fallbackNamespace, loadNamespace } from "./locales";

<I18nProvider
  loadNamespace={loadNamespace}
  fallbackNamespace={fallbackNamespace}
>
  {children}
</I18nProvider>;
```

```tsx
// Advanced typed API generated by tools
import { I18nProvider, useTranslation, loadNamespace } from "./locales";

function HomeTitle() {
  const { t, isReady } = useTranslation("home");
  return isReady ? <h1>{t("title")}</h1> : null;
}
```

```tsx
// Passing a typed server t function through props
import type { AppTranslationFunction } from "./locales";

function Nav({ t }: { t: AppTranslationFunction<"common"> }) {
  return <span>{t("Dashboard")}</span>;
}
```

### `i18n-doctor`

Diagnose whether a project is aligned with `i18nexus@4` and the generated tools workflow.

```bash
i18n-doctor
```

**Checks:**

- Installed `i18nexus` core version
- Installed `i18nexus` package exports
- `tsconfig.json` module resolution for `i18nexus/server`
- `i18nexus.config.json` import source
- Locale namespace folders and fallback namespace
- Generated `locales/index.ts`
- Generated `locales/types/i18nexus.d.ts`
- Missing or empty translations

### `i18n-wrapper`

Automatically wrap hardcoded text with translation functions.

```bash
i18n-wrapper [options]

Options:
  -p, --pattern <pattern>  Source file pattern (default: "src/**/*.{js,jsx,ts,tsx}")
  --source-language <lang> Source language for wrapping: ko|en|auto
  -h, --help              Display help
```

**Features:**

- Detects Korean text by default
- Detects conservative English UI text when `sourceLanguage` is `en` or `auto`
- Wraps text with `t()` function
- Automatically adds `useTranslation()` import
- Preserves existing `t()` calls
- Infers namespace from file location

**Example:**

```bash
# Basic wrapping
npx i18n-wrapper

# Custom pattern
npx i18n-wrapper -p "app/**/*.tsx"

# English-source app
npx i18n-wrapper --source-language en
```

**Before:**

```tsx
export default function Page() {
  return (
    <div>
      <h1>Welcome</h1>
      <p>Hello, User</p>
    </div>
  );
}
```

**After:**

```tsx
"use client";
import { useTranslation } from "i18nexus";

export default function Page() {
  const { t } = useTranslation("page");
  return (
    <div>
      <h1>{t("Welcome")}</h1>
      <p>{t("Hello, User")}</p>
    </div>
  );
}
```

### `i18n-upload`

Upload translation files to Google Sheets.

```bash
i18n-upload [options]

Options:
  -c, --credentials <path>     Path to credentials file (default: "./credentials.json")
  -s, --spreadsheet-id <id>    Google Spreadsheet ID (required)
  -l, --locales-dir <path>     Path to locales directory (default: "./locales")
  -n, --sheet-name <name>      Sheet name (auto-detected from namespaces)
  -a, --auto-translate         Enable auto-translation (GOOGLETRANSLATE formula)
  -f, --force                  Force mode: Clear and re-upload all
  -h, --help                   Display help
```

**Modes:**

1. **Incremental Upload (Default)**: Only uploads new keys

```bash
npx i18n-upload -s "your-spreadsheet-id"
```

2. **Force Upload**: Clears existing data and re-uploads everything

```bash
npx i18n-upload -s "your-spreadsheet-id" --force
```

3. **Auto-translate Mode**: Uses GOOGLETRANSLATE formula for English

```bash
npx i18n-upload -s "your-spreadsheet-id" --auto-translate
```

**Features:**

- Namespace = Sheet name (automatic detection)
- Formula escaping for special characters: `+`, `-`, `=`, `@`, `()`, dates, times
- Creates separate sheet for each namespace
- Preserves existing translations

**Example Output:**

```
📤 Starting Google Sheets upload process...

📦 Detected 3 namespace(s): common, constant, home

📤 Uploading namespace 'common' to sheet 'common'...
✅ Completed upload for namespace 'common'

📤 Uploading namespace 'constant' to sheet 'constant'...
✅ Completed upload for namespace 'constant'

📤 Uploading namespace 'home' to sheet 'home'...
✅ Completed upload for namespace 'home'
```

### `i18n-download`

Download translations from Google Sheets (incremental - only adds new keys).

```bash
i18n-download [options]

Options:
  -c, --credentials <path>     Path to credentials file
  -s, --spreadsheet-id <id>    Google Spreadsheet ID (required)
  -l, --locales-dir <path>     Path to locales directory
  -n, --sheet-name <name>      Sheet name
  --languages <langs>          Comma-separated languages (default: "en,ko")
  -h, --help                   Display help
```

**Example:**

```bash
# Basic download (incremental)
npx i18n-download -s "your-spreadsheet-id"

# With specific languages
npx i18n-download -s "your-spreadsheet-id" --languages "en,ko,ja"
```

**Note:** This command only adds new translations. Existing translations are preserved.

### `i18n-download-force`

Force download all translations, overwriting local files.

```bash
i18n-download-force [options]

Options:
  -c, --credentials <path>     Path to credentials file
  -s, --spreadsheet-id <id>    Google Spreadsheet ID (required)
  -l, --locales-dir <path>     Path to locales directory
  -n, --sheet-name <name>      Sheet name
  --languages <langs>          Comma-separated languages
  -h, --help                   Display help
```

**⚠️ Warning:** This overwrites all local translations.

**Example:**

```bash
npx i18n-download-force -s "your-spreadsheet-id"
```

### `i18n-sheets`

Manage Google Sheets integration.

```bash
i18n-sheets <command>

Commands:
  init                    Initialize Google Sheets setup
  auth                    Verify authentication
  create                  Create new spreadsheet
  list                    List spreadsheets
  info <id>               Get spreadsheet info
  share <id> <email>      Share spreadsheet
```

**Initialize Setup:**

```bash
npx i18n-sheets init
```

This will:

1. Ask if you want namespace separation (separate files vs single file)
2. Create `common` and `constant` namespaces with sample data
3. Generate `i18nexus.config.json`
4. Set up Google Sheets credentials (if provided)

**Example:**

```bash
# Initialize setup
npx i18n-sheets init
? Do you want to use namespace separation? (y/N) y
✅ Created namespace: common
✅ Created namespace: constant
✅ Generated i18nexus.config.json

# Create new spreadsheet
npx i18n-sheets create "My Project Translations"

# Share spreadsheet
npx i18n-sheets share "spreadsheet-id" "user@example.com"
```

## ⚙️ Configuration

### i18nexus.config.json

```json
{
  "sourcePattern": "src/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus",
  "languages": ["en", "ko"],
  "defaultLanguage": "en",
  "sourceLanguage": "en",
  "localesDir": "./locales",
  "fallbackNamespace": "common",
  "staticKeyExtraction": "safe",
  "staticKeyContainerPatterns": [
    "^I18N_KEYS$",
    "_I18N_KEYS$",
    "^TRANSLATION_KEYS$",
    "_TRANSLATION_KEYS$",
    "^translationKeys$",
    "TranslationKeys$"
  ],

  "googleSheets": {
    "spreadsheetId": "your-spreadsheet-id",
    "credentialsPath": "./credentials.json"
  }
}
```

**Options:**

- `sourcePattern` - Glob pattern for source files to scan
- `translationImportSource` - Import path for hooks (e.g., `"i18nexus"`, `"@/app/i18n/client"`, `"react-i18next"`)
- `languages` - Array of language codes
- `defaultLanguage` - Default language code
- `sourceLanguage` - Language file that receives extracted source strings; defaults to `defaultLanguage`
- `localesDir` - Directory for translation files
- `fallbackNamespace` - Default namespace used for fallback keys
- `staticKeyExtraction` - Static constant extraction mode: `"off"`, `"safe"` (default), or `"aggressive"`
- `staticKeyContainerPatterns` - Regex patterns for object/array constant names allowed in safe mode
- `googleSheets.spreadsheetId` - Google Spreadsheet ID
- `googleSheets.credentialsPath` - Path to Google credentials JSON

**Note:** The extractor automatically ignores Next.js route conventions:

- `[id]` - Dynamic routes
- `[...slug]` - Catch-all routes
- `(group)` - Route groups
- `_private` - Private folders

Example: `app/(dashboard)/users/[id]/page.tsx` → namespace: `"users"`

### Support for Any i18n Library

The `translationImportSource` option allows you to use these tools with any i18n library:

**For react-i18next:**

```json
{
  "translationImportSource": "react-i18next"
}
```

**For custom paths:**

```json
{
  "translationImportSource": "@/app/i18n/client"
}
```

The generated types will automatically augment the correct module.

## 🔐 Google Sheets Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Sheets API
4. Create a service account

### 2. Download Credentials

1. Generate JSON key for service account
2. Save as `credentials.json` in project root
3. Add to `.gitignore`:

```gitignore
credentials.json
```

### 3. Share Spreadsheet

1. Create a new Google Spreadsheet
2. Share with service account email (found in credentials.json)
3. Grant "Editor" permission
4. Copy spreadsheet ID from URL

### 4. Initialize

```bash
npx i18n-sheets init
```

## 📊 Workflows

### Workflow 1: New Project Setup

```bash
# 1. Initialize configuration
npx i18n-sheets init

# 2. Auto-wrap existing hardcoded text
npx i18n-wrapper -p "src/**/*.tsx"

# 3. Extract translation keys
npx i18n-extractor

# 4. Upload to Google Sheets
npx i18n-upload -s "your-spreadsheet-id"

# 5. Translate in Google Sheets

# 6. Download translations
npx i18n-download
```

### Workflow 2: Update Translations

```bash
# 1. Extract new keys
npx i18n-extractor

# 2. Upload new keys only (incremental)
npx i18n-upload -s "your-spreadsheet-id"

# 3. Translate new keys in Google Sheets

# 4. Download (incremental)
npx i18n-download
```

### Workflow 3: Type-Safe Constants

```bash
# 1. Add constants to constant namespace
# locales/constant/en.json
{
  "category.all": "All",
  "category.tech": "Technology",
  "category.design": "Design"
}

# 2. Extract and generate types
npx i18n-extractor

# 3. Use in code with type safety
import type { ConstantKeys } from "@/locales/types/i18nexus";

const CATEGORIES: ConstantKeys[] = [
  "category.all",
  "category.tech",
  "category.design"
];
```

## 🎯 Advanced Usage

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: i18n Sync

on:
  push:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Extract translations
        run: npx i18n-extractor

      - name: Upload to Google Sheets
        run: npx i18n-upload -s "${{ secrets.SPREADSHEET_ID }}"
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS }}
```

### Custom Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "i18n:extract": "i18n-extractor",
    "i18n:wrap": "i18n-wrapper -p 'src/**/*.tsx'",
    "i18n:upload": "i18n-upload --merge",
    "i18n:download": "i18n-download",
    "i18n:sync": "npm run i18n:extract && npm run i18n:upload",
    "i18n:update": "npm run i18n:download && npm run i18n:extract"
  }
}
```

### Formula Escaping

The tools automatically escape special characters that Google Sheets might interpret as formulas or special formats:

**Escaped Characters:**

- `+` (plus sign)
- `-` (minus sign at start)
- `=` (equals sign)
- `@` (at sign)
- `(` and `)` (parentheses)
- Date-like formats (e.g., `1-2`, `12/31`)
- Time-like formats (e.g., `12:30`)
- Scientific notation (e.g., `1e5`)

**Example:**

```json
// Your translation
{
  "untitled": "(Untitled)",
  "show_more": "+ Show More",
  "date": "2024-01-01"
}
```

These are uploaded with a leading `'` to prevent formula interpretation, and the `'` is automatically removed during download.

## 🔗 Related

- [i18nexus Core](../core) - Core i18n library
- [Demo App](../../apps/demo) - Live examples and documentation
- [Type Safety Guide](../../TECH_BLOG_TYPE_SAFETY.md) - Deep dive into type safety

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see the [LICENSE](./LICENSE) file for details.

## 📞 Support

- 🐛 [Report Issues](https://github.com/i18n-global/i18nexus-tools/issues)
- 💬 [Discussions](https://github.com/i18n-global/i18nexus-tools/discussions)
- 📧 Email: support@i18nexus.com

## 📈 Version History

### v2.2.0 (Latest)

- ✨ Removed wrapper's redundant generic type generation
- 🔄 Type inference improvements
- 📚 Documentation updates

### v2.1.0

- ✨ `translationImportSource` support for any i18n library
- 🌍 Google Sheets formula escaping
- 📦 Namespace-based sheet organization
- 🛠️ `i18n-sheets init` improvements

### v2.0.0

- 🎯 Complete rewrite with TypeScript
- ⚡ Performance improvements
- 🔒 Enhanced type safety

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

---

**Made with ❤️ by the i18nexus team**
