# CLI Tools Reference

Complete reference for all i18nexus-tools CLI commands.

## 📋 Available Commands

| Command               | Description                 | Usage                               |
| --------------------- | --------------------------- | ----------------------------------- |
| `i18n-sheets`         | Google Sheets integration   | `npx i18n-sheets <command>`         |
| `i18n-wrapper`        | String wrapping tool        | `npx i18n-wrapper [options]`        |
| `i18n-extractor`      | Key extraction tool         | `npx i18n-extractor [options]`      |
| `i18n-upload`         | Upload to Google Sheets     | `npx i18n-upload [options]`         |
| `i18n-download`       | Download from Google Sheets | `npx i18n-download [options]`       |
| `i18n-download-force` | Force download              | `npx i18n-download-force [options]` |
| `i18n-clean-legacy`   | Clean unused keys           | `npx i18n-clean-legacy [options]`   |

## 🔧 i18n-sheets

Google Sheets integration commands.

### Commands

#### `init` - Initialize Project

```bash
npx i18n-sheets init [options]
```

**Options:**

- `-s, --spreadsheet <id>` - Google Spreadsheet ID
- `-c, --credentials <path>` - Path to credentials file (default: `./credentials.json`)
- `-l, --locales <dir>` - Locales directory (default: `./locales`)
- `--languages <langs>` - Comma-separated languages (default: `en,ko`)
- `--typescript` - Generate TypeScript config

**Examples:**

```bash
# Basic initialization
npx i18n-sheets init

# With Google Sheets
npx i18n-sheets init -s 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

# TypeScript config
npx i18n-sheets init --typescript

# Custom languages
npx i18n-sheets init --languages "en,ko,ja,zh"
```

#### `upload` - Upload Translations

```bash
npx i18n-upload [options]
```

**Options:**

- `--force` - Clear all data and re-upload
- `--auto-translate` - Use Google Translate formulas
- `--dry-run` - Preview changes without applying

**Examples:**

```bash
# Upload new keys only
npx i18n-upload

# Force upload with auto-translate
npx i18n-upload --force --auto-translate

# Preview upload
npx i18n-upload --dry-run
```

#### `download` - Download Translations

```bash
npx i18n-download [options]
```

**Options:**

- `--dry-run` - Preview changes without applying

**Examples:**

```bash
# Download new keys only
npx i18n-download

# Preview download
npx i18n-download --dry-run
```

#### `sync` - Bidirectional Sync

```bash
npx i18n-sheets sync [options]
```

**Options:**

- `--force` - Force sync
- `--dry-run` - Preview changes

#### `status` - Show Status

```bash
npx i18n-sheets status [options]
```

**Options:**

- `-s, --spreadsheet <id>` - Check specific spreadsheet

## 🔄 i18n-wrapper

Automatically wrap hardcoded strings with translation functions.

### Usage

```bash
npx i18n-wrapper [options]
```

### Options

| Option                    | Description                                 | Default     |
| ------------------------- | ------------------------------------------- | ----------- |
| `-p, --pattern <pattern>` | File pattern                                | From config |
| `--source-language <lng>` | Source-language matching                    | From config |
| `--key-first`             | Wrap matching dotted translation keys       | `false`     |
| `--no-key-first`          | Disable configured key-first mode for a run | N/A         |

### Examples

```bash
# Wrap all files
npx i18n-wrapper

# Custom pattern
npx i18n-wrapper -p "app/**/*.tsx"

# Enable key-first wrapping for this run
npx i18n-wrapper --key-first

# Review the generated source change
git diff -- app
```

### What Gets Wrapped

**✅ Wrapped:**

- Korean strings in JSX
- English strings in JSX
- Template literals

**❌ Not Wrapped:**

- Arbitrary JavaScript constants, objects, and arrays
- Variables, props, API data, and other runtime values
- Dynamic template literals
- `code`, `pre`, `script`, and `style` content
- Ignored comments

## 📤 i18n-extractor

Extract translation keys from wrapped code.

### Usage

```bash
npx i18n-extractor [options]
```

### Options

| Option                    | Description                | Default     |
| ------------------------- | -------------------------- | ----------- |
| `-p, --pattern <pattern>` | File pattern               | From config |
| `-o, --output <dir>`      | Output directory           | From config |
| `-l, --languages <langs>` | Languages                  | From config |
| `--force`                 | Overwrite all translations | `false`     |
| `--dry-run`               | Preview changes            | `false`     |
| `--csv`                   | Export as CSV              | `false`     |

### Examples

```bash
# Extract keys
npx i18n-extractor

# Force overwrite
npx i18n-extractor --force

# Custom languages
npx i18n-extractor -l "en,ko,ja"

# Export as CSV
npx i18n-extractor --csv

# Preview changes
npx i18n-extractor --dry-run
```

## 🧹 i18n-clean-legacy

Remove unused translation keys.

### Usage

```bash
npx i18n-clean-legacy [options]
```

### Options

| Option                    | Description          | Default     |
| ------------------------- | -------------------- | ----------- |
| `-p, --pattern <pattern>` | File pattern         | From config |
| `-l, --languages <langs>` | Languages            | From config |
| `--no-backup`             | Skip backup creation | `false`     |
| `--dry-run`               | Preview changes      | `false`     |

### Examples

```bash
# Clean unused keys
npx i18n-clean-legacy

# Preview cleanup
npx i18n-clean-legacy --dry-run

# No backup
npx i18n-clean-legacy --no-backup

# Custom languages
npx i18n-clean-legacy -l "en,ko"
```

## 🔧 Common Options

### File Patterns

```bash
# App Router (Next.js 13+)
npx i18n-wrapper -p "app/**/*.{ts,tsx}"

# Pages Router
npx i18n-wrapper -p "pages/**/*.{ts,tsx}"

# Components only
npx i18n-wrapper -p "components/**/*.{js,jsx,ts,tsx}"

# Multiple patterns
npx i18n-wrapper -p "{app,pages}/**/*.{ts,tsx}"
```

### Language Codes

```bash
# Two languages
npx i18n-extractor -l "en,ko"

# Multiple languages
npx i18n-extractor -l "en,ko,ja,zh,es,fr"

# Single language
npx i18n-extractor -l "en"
```

### Dry Run Mode

The extractor, upload, download, and cleanup commands support `--dry-run` to preview changes. The wrapper writes source files directly; run it with a narrow pattern and inspect `git diff` instead.

```bash
# Preview extraction
npx i18n-extractor --dry-run

# Preview upload
npx i18n-upload --dry-run

# Preview download
npx i18n-download --dry-run

# Preview cleanup
npx i18n-clean-legacy --dry-run
```

## 🎯 Workflow Examples

### Basic Workflow

```bash
# 1. Initialize project
npx i18n-sheets init

# 2. Wrap strings
npx i18n-wrapper

# 3. Extract keys
npx i18n-extractor

# 4. Upload to Google Sheets
npx i18n-upload

# 5. Download translations
npx i18n-download
```

### Development Workflow

```bash
# Daily development
npx i18n-wrapper
npx i18n-extractor

# Weekly cleanup
npx i18n-clean-legacy --dry-run
npx i18n-clean-legacy
```

### Force Workflow

```bash
# Complete regeneration
npx i18n-extractor --force
npx i18n-upload --force
```

## 🆘 Troubleshooting

### Common Issues

**Command not found:**

```bash
# Use npx
npx i18n-sheets --help

# Or install globally
npm install -g i18nexus-tools
```

**Config not found:**

```bash
# Initialize project
npx i18n-sheets init
```

**Permission denied:**

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

### Inspecting Wrapper Changes

```bash
# Restrict the wrapper to a directory, then review changes
npx i18n-wrapper -p "app/**/*.tsx"
git diff -- app

# Check configuration
npx i18n-sheets status
```

### Getting Help

```bash
# Command help
npx i18n-sheets --help
npx i18n-wrapper --help
npx i18n-extractor --help

# Specific command help
npx i18n-sheets init --help
npx i18n-upload --help
```
