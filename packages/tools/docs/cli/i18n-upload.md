# i18n-upload Command Reference

Complete reference for the `i18n-upload` command.

## Overview

The `i18n-upload` command uploads local translation files to Google Sheets for collaborative translation work.

Before worksheet access, the command parses every local JSON resource as a
flat string map and requires a locale file for each configured language. A
missing or malformed file aborts without remote mutation.

## Basic Usage

```bash
npx i18n-upload [options]
```

## Options

### `--force`

Force mode - clears all Google Sheets data and re-uploads everything.

**Default:** `false` (incremental mode - only adds new keys)

**Usage:**

```bash
# Incremental mode (default) - adds new keys only
npx i18n-upload

# Force mode - clears and re-uploads all
npx i18n-upload --force
```

### `--auto-translate`

Uploads English translations as Google Translate formulas.

**Usage:**

```bash
# Auto-translate mode
npx i18n-upload --auto-translate

# Force + auto-translate
npx i18n-upload --force --auto-translate
```

**Behavior:**

- Korean: Uploaded as plain text
- English: Uploaded as `=GOOGLETRANSLATE(C2, "ko", "en")` formula
- Google Sheets automatically calculates translations

### `--dry-run`

Print the local namespace-to-sheet plan without modifying Google Sheets. This is a config-only preview: it does not authenticate, make network requests, fetch existing sheet data, or calculate a remote diff.

**Usage:**

```bash
npx i18n-upload --dry-run
```

### `-s, --spreadsheet <id>`

Google Spreadsheet ID (overrides config).

**Usage:**

```bash
npx i18n-upload -s "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
```

### `-c, --credentials <path>`

Path to Google service account credentials file.

**Default:** `./credentials.json` (from config)

**Usage:**

```bash
npx i18n-upload -c "./config/google-credentials.json"
```

### `-h, --help`

Display help information.

**Usage:**

```bash
npx i18n-upload --help
```

## Upload Modes

### Incremental Mode (Default)

Adds new keys without touching existing data.

**Use When:**

- Daily development
- Adding new features
- Collaborative translation in progress

**Behavior:**

```
Local: { "key1": "value1", "key2": "value2", "key3": "value3" }
Sheet: { "key1": "translated1", "key2": "translated2" }

After upload:
Sheet: { "key1": "translated1", "key2": "translated2", "key3": "" }
       ↑ preserved          ↑ preserved          ↑ new key added
```

**Example:**

```bash
# Safe incremental upload
npx i18n-upload
```

### Force Mode

Clears everything and re-uploads all keys.

**Use When:**

- Local files are source of truth
- Google Sheets data is corrupted
- After major refactoring
- Initial project setup

**Behavior:**

```
Local: { "key1": "value1", "key2": "value2" }
Sheet: { "key1": "old1", "key2": "old2", "key3": "old3" }

After upload --force:
Sheet: { "key1": "value1", "key2": "value2" }
       ↑ overwritten   ↑ overwritten   (key3 removed)
```

**Example:**

```bash
# Complete regeneration
npx i18n-upload --force
```

### Auto-Translate Mode

Uploads English as Google Translate formulas.

**Use When:**

- Rapid prototyping
- Getting initial English translations
- Many new Korean keys added

**Behavior:**

```
Local:
{
  "안녕하세요": "안녕하세요",
  "환영합니다": "환영합니다"
}

Uploaded to Google Sheets:
| Key | Korean | English |
|-----|--------|---------|
| 안녕하세요 | 안녕하세요 | =GOOGLETRANSLATE(C2, "ko", "en") |
| 환영합니다 | 환영합니다 | =GOOGLETRANSLATE(C3, "ko", "en") |

Google Sheets calculates:
| Key | Korean | English |
|-----|--------|---------|
| 안녕하세요 | 안녕하세요 | Hello |
| 환영합니다 | 환영합니다 | Welcome |
```

**Example:**

```bash
# Quick English drafts
npx i18n-upload --auto-translate

# Force + auto-translate
npx i18n-upload --force --auto-translate
```

## Google Sheets Setup

### 1. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Sheets API
4. Create Service Account
5. Download JSON credentials
6. Save as `credentials.json`

### 2. Create Spreadsheet

1. Create new Google Spreadsheet
2. Note the spreadsheet ID from URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### 3. Share Spreadsheet

1. Open spreadsheet
2. Click "Share"
3. Add service account email (from credentials.json)
4. Give "Editor" permissions

### 4. Configure Project

```json
// i18nexus.config.json
{
  "googleSheets": {
    "spreadsheetId": "YOUR_SPREADSHEET_ID",
    "credentialsPath": "./credentials.json",
    "sheetName": "Translations"
  }
}
```

## Spreadsheet Format

### Generated Headers

```
| Key | Korean | English | Japanese | ... |
```

Based on `languages` in config.

### Data Format

```
| Key        | Korean     | English | Japanese |
|------------|------------|---------|----------|
| 안녕하세요 | 안녕하세요 | Hello   | こんにちは |
| 환영합니다 | 환영합니다 | Welcome | ようこそ   |
```

## Workflow Examples

### Basic Upload

```bash
# 1. Extract keys locally
npx i18n-extractor

# 2. Upload to Google Sheets
npx i18n-upload

# 3. Translators work in Google Sheets

# 4. Download completed translations
npx i18n-download
```

### Force Upload Workflow

```bash
# 1. Preview changes
npx i18n-upload --force --dry-run

# 2. Backup Google Sheets manually

# 3. Force upload
npx i18n-upload --force

# 4. Verify in Google Sheets
```

### Auto-Translate Workflow

```bash
# 1. Extract Korean keys
npx i18n-extractor

# 2. Upload with auto-translation
npx i18n-upload --auto-translate

# 3. Review auto-translations in Google Sheets

# 4. Refine translations manually

# 5. Download final translations
npx i18n-download
```

### Development Workflow

```bash
# Daily development
npx i18n-wrapper
npx i18n-extractor
npx i18n-upload  # Incremental

# Weekly/monthly
npx i18n-clean-legacy
npx i18n-upload --force
```

## Configuration

### From Config File

```json
// i18nexus.config.json
{
  "languages": ["en", "ko", "ja"],
  "localesDir": "./locales",
  "googleSheets": {
    "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
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

Environment variables override the corresponding values in
`i18nexus.config.json`; explicit CLI flags override both.

## Advanced Usage

### Custom Spreadsheet

```bash
# Upload to different spreadsheet
npx i18n-upload -s "different-spreadsheet-id"
```

### Custom Credentials

```bash
# Use different credentials
npx i18n-upload -c "./prod-credentials.json"
```

### Combined Options

```bash
# Force upload with auto-translate and custom sheet
npx i18n-upload \
  --force \
  --auto-translate \
  -s "spreadsheet-id" \
  -c "./credentials.json"
```

## Error Handling

### Authentication Errors

```bash
❌ Failed to authenticate with Google Sheets
Check your credentials.json file
```

**Solutions:**

1. Verify credentials file exists
2. Check service account permissions
3. Re-download credentials from Google Cloud

### Access Denied

```bash
❌ Access denied to spreadsheet
```

**Solutions:**

1. Share spreadsheet with service account email
2. Give "Editor" permissions
3. Check spreadsheet ID is correct

### API Quota Exceeded

```bash
❌ Google Sheets API quota exceeded
```

**Solutions:**

1. Wait and retry
2. Use different Google account
3. Request quota increase

### Network Errors

```bash
❌ Network error: Connection timeout
```

**Solutions:**

1. Check internet connection
2. Check firewall settings
3. Retry upload

## Best Practices

### 1. Use Incremental Mode Daily

```bash
# Safe daily uploads
npx i18n-upload
```

### 2. Preview Before Force

```bash
# Always preview first
npx i18n-upload --force --dry-run
```

### 3. Backup Google Sheets

Before force mode:

1. Download spreadsheet as Excel
2. Or use Google Sheets version history

### 4. Auto-Translate for Drafts

```bash
# Quick English drafts
npx i18n-upload --auto-translate
```

### 5. Coordinate with Team

Notify translators before force uploads.

## Troubleshooting

### Issue: Existing Translations Overwritten

**Symptoms:**

- Translator work lost
- English translations reset

**Solutions:**

1. Don't use `--force` during active translation
2. Use incremental mode
3. Restore from Google Sheets version history

### Issue: Auto-Translate Not Working

**Symptoms:**

- Formulas not calculated
- Shows formula string instead

**Solutions:**

1. Wait for Google Sheets to calculate
2. Check formula syntax
3. Download after calculation completes

### Issue: New Keys Not Appearing

**Symptoms:**

- New keys not in Google Sheets
- Upload completes but nothing changes

**Solutions:**

1. Extract keys first: `npx i18n-extractor`
2. Verify keys in local files
3. Check incremental mode is working

## Performance

### Large Projects

```bash
# Upload may take time with many keys
npx i18n-upload

# Progress shown:
# Uploading... 500/1000 keys
```

### Optimization Tips

1. Clean unused keys first
2. Use incremental mode
3. Batch uploads for large changes

## Output Examples

### Incremental Upload

```bash
$ npx i18n-upload

🔍 Reading local translations...
  ✅ locales/en.json (205 keys)
  ✅ locales/ko.json (205 keys)

📤 Connecting to Google Sheets...
  ✅ Authenticated successfully

📊 Analyzing existing data...
  - Existing keys: 200
  - New keys: 5
  - Mode: Incremental (preserving existing)

⬆️ Uploading translations...
  ✅ Added 5 new keys
  ✅ Preserved 200 existing translations

✅ Upload completed successfully!
```

### Force Upload

```bash
$ npx i18n-upload --force

🔍 Reading local translations...
  ✅ locales/en.json (205 keys)
  ✅ locales/ko.json (205 keys)

📤 Connecting to Google Sheets...
  ✅ Authenticated successfully

⚠️  Force mode: Will clear all existing data

🗑️ Clearing existing data...
  ✅ Cleared 250 rows

⬆️ Uploading translations...
  ✅ Uploaded 205 keys

✅ Force upload completed successfully!
```

### Auto-Translate Upload

```bash
$ npx i18n-upload --auto-translate

🔍 Reading local translations...
  ✅ locales/en.json (205 keys)
  ✅ locales/ko.json (205 keys)

⬆️ Uploading with auto-translation...
  ✅ Korean: Plain text
  ✅ English: GOOGLETRANSLATE formulas

💡 Google Sheets will calculate translations automatically
   Use 'i18n-download' after formulas are calculated

✅ Auto-translate upload completed!
```

## See Also

- [i18n-download](./i18n-download.md) - Download translations
- [i18n-extractor](./i18n-extractor.md) - Extract keys
- [Google Sheets Guide](../guides/google-sheets.md) - Setup guide
- [Configuration](../guides/configuration.md) - Config options
