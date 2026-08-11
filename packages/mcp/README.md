# i18nexus MCP

`i18nexus-mcp` is a local Model Context Protocol server that inspects a React or Next.js project and prepares an i18nexus configuration for it.

It detects the framework from the manifest and route directories. It detects npm, pnpm, or Yarn from the lockfile. It then suggests a source glob, a namespace location, and locale file paths that match the project.

## Requirements

- Node.js 20 or newer
- A local MCP host that supports stdio servers
- A target project with a valid `package.json` when scripts or dependencies should be changed

## Run from this repository

```bash
npm install
npm run build --workspace=i18nexus-mcp
node packages/mcp/dist/bin/i18nexus-mcp.js
```

The server communicates through standard input and standard output. Startup messages and errors use standard error so they do not corrupt MCP messages.

## MCP host configuration

Build the package first. Then use the absolute path to the generated entry file in your MCP host configuration.

```json
{
  "mcpServers": {
    "i18nexus": {
      "command": "node",
      "args": [
        "/absolute/path/to/i18n-mono/packages/mcp/dist/bin/i18nexus-mcp.js"
      ]
    }
  }
}
```

After this package is published, the command can use `npx` with `i18nexus-mcp` instead.

## Tools

### `analyze_i18nexus_project`

This read-only tool accepts `projectPath`. It returns the detected framework, package manager, source paths, route path, current config, dependency status, and a suggested config.

Dependency declarations and actual `node_modules` installation are reported separately. A package can be present in `package.json` without being installed.

### `setup_i18nexus`

This tool creates or updates `i18nexus.config.json`. It can also add i18n commands to `package.json` and create initial locale files.

`dryRun` defaults to `true`. Pass `dryRun: false` only after reviewing the returned file plan. Existing config keys and existing package scripts are preserved unless a caller explicitly asks for detected config values to replace known values.

Dependency installation is disabled by default. Set `installDependencies: true` to run the detected package manager and install `i18nexus` as a runtime dependency and `i18nexus-tools` as a development dependency. If more than one lockfile exists, pass `packageManager` explicitly.

Example arguments for an actual setup:

```json
{
  "projectPath": "/absolute/path/to/project",
  "languages": ["ko", "en"],
  "defaultLanguage": "ko",
  "sourceLanguage": "ko",
  "dryRun": false,
  "installDependencies": false
}
```

### `validate_i18nexus_setup`

This read-only tool checks the config shape, language rules, source pattern, initial locale files, manifest declarations, and actual installation status.

### `run_i18nexus_tool`

This tool only uses `i18nexus-tools` that is actually installed in the target project's `node_modules`. It does not accept arbitrary commands or arbitrary CLI arguments. Typed inputs are converted into the supported command arguments.

Execution requires `i18nexus-tools` 3.2.1 or newer. Starting with this version, extractor dry-run is guaranteed not to create output directories.

The supported actions are `doctor`, `wrapper`, `extractor`, `type`, `clean-legacy`, and Google Sheets `upload` and `download`. Sheets actions require service-account credentials and access to the target spreadsheet.

`doctor` executes immediately because it is an inspection command. The result still reports `safety.executesProjectCode` because the target project's installed JavaScript is executed.

`extractor`, `clean-legacy`, and Google Sheets actions execute their native dry-run when `applyChanges` is omitted or false. Upload preview validates credentials and reads the sheet to calculate exact append or replacement counts without changing it. Download preview reads the sheet and calculates local changes without writing files. `wrapper` and `type` do not have native dry-run support, so preview returns a command plan. Pass `applyChanges: true` only after reviewing the result.

Default download preserves local translations and adds keys found remotely. `force: true` replaces local locale files with the sheet contents. Upload with `force: true` clears existing sheet contents before replacement, so review its preview first. Credential file contents are never included in the MCP response.

```json
{
  "projectPath": "/absolute/path/to/project",
  "tool": "extractor",
  "languages": ["ko", "en"],
  "staticKeyExtraction": "safe",
  "applyChanges": false
}
```

The resolved executable must stay inside the installed package. Source patterns, locale or type output paths, and Google Sheets credential files must stay inside the target project. Every execution also has timeout and output-size limits. The target package runs as a local Node.js process rather than in a separate sandbox. Arbitrary MCP server secrets and `NODE_OPTIONS` are not forwarded, but callers must still trust the package installed in the target project.

## Files created by setup

A Next.js App Router project normally receives these files:

```text
i18nexus.config.json
locales/
  common/
    ko.json
    en.json
```

The tool adds these scripts when they do not already exist:

```json
{
  "scripts": {
    "i18n:wrap": "i18n-wrapper",
    "i18n:extract": "i18n-extractor",
    "i18n:type": "i18n-type",
    "i18n:doctor": "i18n-doctor"
  }
}
```

## Current boundary

The MCP server configures i18nexus, prepares locale files, and plans or runs installed core workflow and Google Sheets commands. It does not rewrite application providers or components because those edits depend on each project's rendering and state boundaries. It also does not create Google service account credentials.

The setup tool only writes config and locale paths inside the resolved project directory. An invalid existing JSON config is not replaced unless `overwriteExistingConfig` is explicitly enabled.
