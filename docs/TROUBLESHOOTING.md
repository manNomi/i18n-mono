# Troubleshooting

## Unsupported Runtime

Supported Node majors are 22, 24, and 26. Node 23 and 25 are not release lines
claimed by this repository. Check the active runtime with `node --version`, then
run the matrix gate with:

```bash
npm run verify:node-matrix
```

The server entrypoint uses Node filesystem APIs and is not supported in Edge
runtimes.

## Configuration Is Ignored

Only `i18nexus.config.json` is automatically discovered. A
`i18nexus.config.js`, `.mjs`, `.cjs`, or `.ts` file is ignored with a warning.
Move serializable settings into JSON, pass `getTranslation()` options directly,
or import a typed `defineConfig` object explicitly from application code.

Run the local diagnostic after editing:

```bash
npx i18n-doctor
```

Missing or malformed JSON is a blocking doctor finding.

## Translation Returns Its Key

Missing keys intentionally return the key. An existing empty string is a real
translation and remains empty; it does not trigger fallback. Check that locale
files are flat JSON objects whose values are all strings. Nested objects are not
part of the resource contract.

For release-time completeness checks:

```bash
npx i18n-type --strict
npx i18n-doctor
```

## Lazy Namespace Failed

A failed client namespace load is not committed as loaded. The hook remains
usable and falls back to keys/resources already present. Fix the loader or
network condition and call `ensureNamespaceLoaded(namespace)` again through the
i18n context; the second call starts a new load.

Concurrent requests for the same namespace share one in-flight promise.

## Server Locale Read Fails

`getTranslation()` rejects when a requested resource is missing, malformed,
outside the configured locale root, reachable only through an escaping symlink,
or not a flat string record. Do not return raw server errors to untrusted
clients because diagnostics can contain absolute filesystem paths.

After repairing files, call `invalidateCache()` for affected entries or use
`disableCache: true` while diagnosing.

When `getTranslation()` is called without an explicit language, it attempts to
read `next/headers`. Outside a Next.js request context that dependency is
unavailable, so the API uses empty headers and selects the configured default
language. Pass `language` explicitly in scripts, tests and other non-Next
server runtimes.

## Google Sheets Authentication

Connection precedence is explicit CLI option, then environment variable, then
`i18nexus.config.json`, then built-in default. Export variables in the shell or
CI; `.env.local` is not loaded automatically:

```bash
export GOOGLE_SPREADSHEET_ID=your-sheet-id
export GOOGLE_CREDENTIALS_PATH=/absolute/path/credentials.json
npx i18n-sheets status
```

Google API errors are reduced to a message and safe status. Diagnostics that
mention authorization, bearer tokens, private keys, or secrets are replaced
with a redaction message. Never commit the credential file.

Local mocked integration tests exercise upload, download, force, failure, and
transaction behavior without external credentials. A team adopting the live
service should separately run a disposable-sheet acceptance test in its own
Google Cloud account because account policy, quota, and sharing permissions are
external to this repository.

Each worksheet must start with a `Key` column. Remaining columns are mapped
from language names (`English`, `Korean`, `Japanese`, and other documented
names) or exact locale codes such as `pt-BR`. Incremental upload appends new
keys after existing rows. Force upload replaces the remote table. Download
rejects a missing requested language column before any local replacement, and
force download retains remote keys with empty-string values. Upload rejects a
missing configured locale file before worksheet access and validates every
namespace before the first remote mutation. All local transaction targets
reject escaping paths and symbolic links.

## CLI Recovery

- Every documented dry-run returns before authentication, network calls, and writes.
- Download, sync-local, CSV import, generated locale index and cleanup
  multi-file writes use staged replacements and rollback.
- Download recovery uses `.i18nexus-download-transaction.json` under the locale root.
- The journal is crash recovery, not an inter-process lock. Serialize mutating
  commands that target the same locale root.
- Bidirectional sync cannot be atomic across Google Sheets and the local
  filesystem. Local file commits are atomic; a remote update may already have
  succeeded when a later local commit fails. Repair the local cause and rerun
  sync, which compares both sides again.
- `i18n-sheets init` skips existing config, locale, index, and example files.

If a command fails, preserve its output, rerun `npx i18n-doctor`, inspect the
transaction journal if present, repair the cause, and retry the same command.

## Namespace Inference And Language Cookie

Server call-site namespace inference parses `Error.stack` and is best effort.
Pass a namespace explicitly or use `disableAutoInference: true` in runtimes
where stack paths are transformed.

Client language persistence defaults to `SameSite=Lax`, a root path, and a
365-day expiry. Set `cookieOptions.secure: true` for HTTPS-only deployments;
the library cannot infer a deployment's TLS termination policy reliably.

## Platform Scope

The verified local matrix is macOS arm64 and CI Linux. Windows behavior is not
claimed until a Windows CI job runs the same gates; path-sensitive adopters
should treat that as an explicit acceptance item.
