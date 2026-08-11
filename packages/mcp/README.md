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

The MCP server configures i18nexus and prepares locale files. It does not rewrite application providers or components because those edits depend on each project's rendering and state boundaries. It also does not create Google service account credentials.

The setup tool only writes config and locale paths inside the resolved project directory. An invalid existing JSON config is not replaced unless `overwriteExistingConfig` is explicitly enabled.
