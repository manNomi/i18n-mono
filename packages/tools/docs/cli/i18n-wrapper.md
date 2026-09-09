# i18n-wrapper Command Reference

Complete reference for the `i18n-wrapper` command.

## Overview

The `i18n-wrapper` command automatically wraps hardcoded strings with `t()` translation functions and adds necessary import statements and hooks.

**Available entrypoints:**

- **`i18n-wrapper`** (Standard, Recommended) - Uses Babel parser (stable, well-tested, faster)
- **`i18n-wrapper-swc-worker`** - Explicit SWC worker-thread implementation
- **`i18n-wrapper-swc`** (Deprecated) - Compatibility alias for the same adaptive engine as `i18n-wrapper`; it does not force SWC

## Basic Usage

```bash
# Standard version (Babel)
npx i18n-wrapper [options]

# Explicit SWC worker implementation
npx i18n-wrapper-swc-worker [options]
```

## ⚠️ Performance Comparison

```bash
# Test with Babel (standard, recommended)
I18N_PERF_MONITOR=true I18N_PERF_VERBOSE=true npx i18n-wrapper

# Test with explicit SWC workers
I18N_PERF_MONITOR=true I18N_PERF_VERBOSE=true npx i18n-wrapper-swc-worker
```

**Current Test Results:**

- The adaptive engine uses Babel below 3,000 matched files and SWC workers at or above that threshold.
- Use `i18n-wrapper-swc-worker` only when you intentionally want worker-thread execution.
- `i18n-wrapper-swc` remains only to avoid breaking old scripts and reports the strategy it actually selected.

Both supported engines target the same transformation contract, with separate executable fixtures.

## Options

### `-p, --pattern <pattern>`

Specifies the glob pattern for source files to process.

**Default:** `"src/**/*.{js,jsx,ts,tsx}"` (from config)

**Examples:**

```bash
# Process app directory (Next.js App Router)
npx i18n-wrapper -p "app/**/*.{ts,tsx}"

# Process pages directory (Next.js Pages Router)
npx i18n-wrapper -p "pages/**/*.{ts,tsx}"

# Process specific components
npx i18n-wrapper -p "src/components/**/*.tsx"

# Multiple patterns
npx i18n-wrapper -p "{app,components}/**/*.{ts,tsx}"
```

### `--source-language <lang>`

Controls which source text language the wrapper detects.

**Default:** `sourceLanguage` from config, or `defaultLanguage` when
`sourceLanguage` is omitted.

**Values:**

- `ko`: wrap Korean text. This preserves the legacy behavior.
- `en`: wrap conservative English UI text in JSX text nodes and user-facing JSX
  attributes such as `placeholder`, `title`, `aria-label`, `alt`, and `label`.
- `auto`: wrap Korean text plus conservative English UI text.

**Examples:**

```bash
# English-source app
npx i18n-wrapper --source-language en

# Korean-source app
npx i18n-wrapper --source-language ko
```

### `--dry-run`

Preview changes without modifying any files.

**Usage:**

```bash
npx i18n-wrapper --dry-run
```

**Output:**

- Shows which files would be modified
- Displays preview of changes
- Doesn't write to disk

### `--verbose`

Enable verbose output for detailed logging.

**Usage:**

```bash
npx i18n-wrapper --verbose
```

**Output:**

- Detailed processing information
- File-by-file progress
- Transformation details

### `-h, --help`

Display help information.

**Usage:**

```bash
npx i18n-wrapper --help
```

## What Gets Wrapped

### ✅ Automatically Wrapped

**Korean Strings:**

```tsx
// Before
<h1>안녕하세요</h1>

// After
<h1>{t("안녕하세요")}</h1>
```

**English UI Strings when `--source-language en` or `sourceLanguage: "en"` is configured:**

```tsx
// Before
<input placeholder="Search..." />
<button>Add Product</button>
<div className="flex items-center">Products</div>

// After
<input placeholder={t("Search...")} />
<button>{t("Add Product")}</button>
<div className="flex items-center">{t("Products")}</div>
```

**Template Literals:**

```tsx
// Before
<p>{`사용자: ${count}명`}</p>

// After
<p>{t("사용자: {{count}}명", { count })}</p>
```

**Static Constants:**

```tsx
// Before
const NAV_ITEMS = [
  { path: "/home", label: "홈" },
  { path: "/about", label: "소개" },
];

function Navigation() {
  return NAV_ITEMS.map((item) => <a href={item.path}>{item.label}</a>);
}

// After
const NAV_ITEMS = [
  { path: "/home", label: "홈" },
  { path: "/about", label: "소개" },
];

function Navigation() {
  const { t } = useTranslation();
  return NAV_ITEMS.map((item) => <a href={item.path}>{t(item.label)}</a>);
}
```

### ❌ Automatically Excluded

**API Data:**

```tsx
const [users, setUsers] = useState([]);

// user.name is NOT wrapped (API data)
{
  users.map((user) => <div>{user.name}</div>);
}
```

**Props Data:**

```tsx
interface Props {
  items: Array<{ label: string }>;
}

// item.label is NOT wrapped (props)
function List({ items }: Props) {
  return items.map((item) => <div>{item.label}</div>);
}
```

**Dynamic Variables:**

```tsx
let dynamicText = "동적 텍스트"; // NOT wrapped (let/var)
```

## Ignore Comments

Use `// i18n-ignore` or `/* i18n-ignore */` to skip wrapping:

```tsx
// i18n-ignore
const apiKey = "한글 API 키";

{
  /* i18n-ignore */
}
<p>이것은 무시됩니다</p>;
```

## Hook Injection

변환 모드는 `i18nexus.config.json`의 `mode` 옵션으로 제어합니다.

### Client Mode (`mode: "client"`)

모든 컴포넌트에 `useTranslation` 훅과 `'use client'` 디렉티브를 추가합니다:

```tsx
// Before
export default function Welcome() {
  return <h1>안녕하세요</h1>;
}
```

```tsx
// After
"use client";

import { useTranslation } from "i18nexus";

export default function Welcome() {
  const { t } = useTranslation();
  return <h1>{t("안녕하세요")}</h1>;
}
```

### Server Mode (`mode: "server"`)

모든 컴포넌트를 `async` 함수로 변환하고 서버 함수를 주입합니다:

```tsx
// Before
export default function ServerPage() {
  return <h1>서버 렌더링</h1>;
}

// After
import { getTranslation } from "i18nexus/server";

export default async function ServerPage() {
  const { t } = await getTranslation();
  return <h1>{t("서버 렌더링")}</h1>;
}
```

### Mode Configuration

```json
{
  "mode": "server",
  "serverTranslationFunction": "getTranslation"
}
```

- `mode`: `"client"` 또는 `"server"` (선택사항)
- `serverTranslationFunction`: 서버 모드에서 사용할 함수명 (기본값: `"getTranslation"`)

## Template Literal Conversion

### Simple Variables

```tsx
// Before
{
  `총 ${count}개`;
}

// After
{
  t("총 {{count}}개", { count });
}
```

### Object Properties

```tsx
// Before
{
  `이름: ${user.name}`;
}

// After
{
  t("이름: {{user_name}}", { user_name: user.name });
}
```

### Complex Expressions

```tsx
// Before
{
  `결과: ${count * 2}`;
}

// After
{
  t("결과: {{expr0}}", { expr0: count * 2 });
}
```

## Configuration

The wrapper reads configuration from `i18nexus.config.json`:

```json
{
  "sourcePattern": "src/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus",
  "mode": "server",
  "serverTranslationFunction": "getTranslation"
}
```

### Mode Options

**Server Mode:**

```json
{
  "mode": "server",
  "serverTranslationFunction": "getTranslation"
}
```

**Client Mode:**

```json
{
  "mode": "client"
}
```

### Custom Import Source

```json
{
  "translationImportSource": "@/lib/i18n"
}
```

Result:

```tsx
import { useTranslation } from "@/lib/i18n";
```

### Custom Server Function

다른 라이브러리를 사용하는 경우:

```json
{
  "mode": "server",
  "serverTranslationFunction": "getServerT"
}
```

## Workflow Examples

### Basic Workflow

```bash
# 1. Preview changes
npx i18n-wrapper --dry-run

# 2. Apply changes
npx i18n-wrapper

# 3. Extract keys
npx i18n-extractor
```

### Next.js App Router

```bash
# Process app directory
npx i18n-wrapper -p "app/**/*.{ts,tsx}"

# With verbose output
npx i18n-wrapper -p "app/**/*.{ts,tsx}" --verbose
```

### Specific Components

```bash
# Process only UI components
npx i18n-wrapper -p "src/components/ui/**/*.tsx"

# Preview changes first
npx i18n-wrapper -p "src/components/ui/**/*.tsx" --dry-run
```

## Common Use Cases

### 1. New Project Setup

```bash
# Initialize
npx i18n-sheets init

# Wrap all strings
npx i18n-wrapper

# Extract keys
npx i18n-extractor
```

### 2. Gradual Migration

```bash
# Start with one directory
npx i18n-wrapper -p "src/components/auth/**/*.tsx"

# Then expand
npx i18n-wrapper -p "src/components/**/*.tsx"

# Finally, entire project
npx i18n-wrapper
```

### 3. Feature Development

```bash
# Develop feature in Korean
# Write code: <h1>새로운 기능</h1>

# Wrap after development
npx i18n-wrapper -p "src/features/new-feature/**/*.tsx"

# Extract and translate
npx i18n-extractor
```

## Error Handling

### File Parse Errors

```bash
⚠️ Failed to parse: src/components/BadFile.tsx
Skipping file...
```

**Solution:** Fix syntax errors in the file.

### No Files Found

```bash
⚠️ No files matched pattern: app/**/*.tsx
```

**Solution:** Check pattern and file locations.

### Permission Denied

```bash
❌ Permission denied: src/components/Component.tsx
```

**Solution:** Check file permissions.

## Performance Tips

### Large Codebases

```bash
# Process in batches
npx i18n-wrapper -p "src/components/a*/**/*.tsx"
npx i18n-wrapper -p "src/components/b*/**/*.tsx"
```

### Exclude Directories

```bash
# Skip node_modules, dist, etc.
npx i18n-wrapper -p "src/**/*.{ts,tsx}"
# .gitignore is automatically respected
```

## Best Practices

### 1. Always Preview First

```bash
npx i18n-wrapper --dry-run
```

### 2. Use Version Control

```bash
git add .
git commit -m "Before i18n wrapping"
npx i18n-wrapper
git diff  # Review changes
```

### 3. Process Incrementally

Start with small sections, review, then expand.

### 4. Use Ignore Comments

Mark non-translatable content:

```tsx
// i18n-ignore
const CONFIG = { ... };
```

### 5. Review Edge Cases

Check API data, props, and dynamic content after wrapping.

## Troubleshooting

### Issue: Wrapped Too Much

**Symptom:** API data or props got wrapped

**Solution:**

1. Use `// i18n-ignore` comments
2. Check data source patterns
3. Report issue if legitimate case

### Issue: Didn't Wrap Enough

**Symptom:** Some strings not wrapped

**Solution:**

1. Check if strings contain Korean/English
2. Verify file matches pattern
3. Check for syntax errors

### Issue: Hook Not Added

**Symptom:** `t` is not defined

**Solution:**

1. Check `mode` configuration in `i18nexus.config.json`
2. Verify import source in config
3. Ensure component matches source pattern
4. Manual addition if needed

## See Also

- [i18n-extractor](./i18n-extractor.md) - Extract translation keys
- [Getting Started Guide](../guides/getting-started.md) - Complete workflow
- [Configuration](../guides/configuration.md) - Configuration options
- [FAQ](../troubleshooting/faq.md) - Common questions
