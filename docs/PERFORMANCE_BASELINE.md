# Performance Baseline

This document records reproducible engineering baselines, not application
latency guarantees. Results depend on hardware, Node, bundler settings,
translation shape, and surrounding application code.

## Browser Bundle

Command:

```bash
npx --yes --package=node@22 --call='npm run build --workspace=i18nexus && npm run smoke:bundle --workspace=i18nexus'
```

Measured on Node 22.23.1, macOS arm64, esbuild 0.25.11, with React and
`react/jsx-runtime` externalized:

| Consumer entry                        | Minified |    Gzip |
| ------------------------------------- | -------: | ------: |
| `localizeUrl` only                    |  1,064 B |   610 B |
| Provider + translation/language hooks |  9,987 B | 3,339 B |

The bundle smoke fails above 2,500 B gzip for the URL-only entry or 15,000 B
gzip for the client runtime. It also fails if the URL-only entry retains React
runtime markers. These are regression budgets, not promises that every app
bundle has the same size.

## Translation Microbenchmark

Command:

```bash
npx --yes --package=node@22 --call='npm run build --workspace=i18nexus && npm run benchmark:translation --workspace=i18nexus'
```

On the same environment, 25 samples of 50,000 interpolated server translation
calls produced:

| Metric |                        Result |
| ------ | ----------------------------: |
| p50    | 0.3055 microseconds/operation |
| p95    | 0.3392 microseconds/operation |

The benchmark has no pass/fail latency threshold because microbenchmark timing
is host-sensitive. Its purpose is to make changes visible and reproducible.

## Package Artifacts

`npm pack --dry-run` on the verified artifacts reported:

| Package                |    Packed |  Unpacked | Files |
| ---------------------- | --------: | --------: | ----: |
| `i18nexus@4.0.1`       |  58,377 B | 247,778 B |    61 |
| `i18nexus-tools@3.1.0` | 102,124 B | 445,480 B |    97 |

Run each package's `npm pack --dry-run` before release and record changed values
in review evidence.
