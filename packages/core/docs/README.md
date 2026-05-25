# i18nexus Documentation

Complete documentation for i18nexus - Type-safe React i18n toolkit.

## 📚 Table of Contents

- [Quick Links](#quick-links)
- [Guides](#guides)
- [API Reference](#api-reference)
- [Release Notes](#release-notes)
- [Examples](#examples)

---

## Quick Links

- 🏠 [Main README](../README.md)
- 📦 [npm Package](https://www.npmjs.com/package/i18nexus)
- 🐙 [GitHub Repository](https://github.com/manNomi/i18nexus)
- 📋 [CHANGELOG](../CHANGELOG.md)

---

## Guides

### Getting Started

- [Quick Start](../README.md#quick-start)
- [Installation](../README.md#installation)

### Core Features

#### 🧭 API Tracks

- **Beginner API** - `I18nProvider` + root `useTranslation`
- **Advanced Typed API** - `createI18n` for namespace/key inference
- **[createI18n DX Audit](./create-i18n-dx-audit.md)** - Why `createI18n` is kept and repositioned

#### 🌐 Accept-Language Detection

- **[Accept-Language Guide](./guides/accept-language.md)** - Browser language auto-detection
  - How it works
  - Usage examples
  - Quality values (q-factor)
  - Debugging tips

#### 🎨 Variable Interpolation

- **[Interpolation Guide](./guides/interpolation.md)** - Dynamic values in translations
  - `{{variable}}` syntax
  - Styled variables (Client)
  - Server Component support
  - Real-world examples

#### 🎯 Type Safety

- **[Typed Config Guide](./guides/typed-config.md)** - TypeScript configuration
  - Type-safe language codes
  - IDE autocomplete
  - Custom import sources
  - Migration from JSON

#### 🛠️ Developer Tools

- **[DevTools Guide](./guides/devtools.md)** - Visual debugging
  - `I18NexusDevtools` from `i18nexus/devtools`
  - Features overview
  - Customization options
  - Best practices

---

## API Reference

### Server-Side API

- **[Server API](./api/server.md)** - Server Component utilities
  - `getTranslation()`
  - `getServerLanguage()`
  - `parseAcceptLanguage()`
  - `createServerTranslation()`
  - `createServerI18nWithTranslations()`
  - Complete type definitions

### Client-Side API

- **[Client API](./api/client.md)** - Client Component hooks
  - `useTranslation()`
  - `useLanguageSwitcher()`
  - `I18nProvider`
  - `createI18n()`
  - `I18NexusDevtools` subpath
  - Complete type definitions

### Types

- **[Types Reference](./api/types.md)** - TypeScript types
  - Core types
  - Hook return types
  - Configuration types
  - Utility types

---

## Release Notes

### Latest Releases

- **Current 4.x docs** - Slim root API, devtools subpath, lazy namespace loading, and `createI18n` advanced typed API
  - [Migration v4](./MIGRATION_V4.md)
  - [Migration v3](./MIGRATION_V3.md)
  - [Lazy Loading](./LAZY_LOADING.md)
  - [createI18n DX Audit](./create-i18n-dx-audit.md)

- **[v2.7.0](./releases/v2.7.0.md)** - Accept-Language Auto-Detection
  - Browser language detection
  - Quality value support
  - Region code support

- **[v2.6.0](./releases/v2.6.0.md)** - Variable Interpolation & CI/CD
  - `{{variable}}` syntax
  - Styled variables
  - GitHub Actions automation

- **[v2.5.2](./releases/v2.5.2.md)** - Developer Tools
  - Historical `I18NexusDevtools` release note
  - TypeScript config support
  - Type-safe hooks

- **[v2.1.0](./releases/v2.1.0.md)** - Server Components Support
  - Full Next.js App Router support
  - Server-side utilities
  - Zero hydration mismatch

- **[v2.0.6](./releases/v2.0.6.md)** - Initial Release (2.x)
  - Basic I18n components
  - CLI tools
  - Google Sheets integration

### 1.x Series (Legacy)

- **[v1.3.1](./releases/v1.3.1.md)** - Final 1.x Release
  - Bug fixes and polish
  - Production stability

- **[v1.3.0](./releases/v1.3.0.md)** - Feature Enhancements
  - Enhanced CLI tools
  - Performance improvements

- **[v1.2.0](./releases/v1.2.0.md)** - Minor Features
  - Google Sheets enhancements
  - Multiple patch releases (v1.2.1-v1.2.5)

- **[v1.1.0](./releases/v1.1.0.md)** - CLI Tool Addition
  - New i18n-sheets command

- **[v1.0.4](./releases/v1.0.4.md)** - First Stable Release
  - Initial stable version

### Version History

See [CHANGELOG.md](./CHANGELOG.md) for complete version history.

---

## Examples

### Code Examples

Examples are available in the [`examples/`](../examples/) directory:

- **[DevtoolsExample.tsx](../examples/DevtoolsExample.tsx)** - DevTools usage
- **[InterpolationExample.tsx](../examples/InterpolationExample.tsx)** - Client Component variables
- **[ServerInterpolationExample.tsx](../examples/ServerInterpolationExample.tsx)** - Server Component variables

### Demo Application

Full demo application available at [`i18nexus-demo/`](../../i18nexus-demo/)

---

## Documentation Structure

```
docs/
├── README.md                 # This file
├── guides/                   # User guides
│   ├── accept-language.md   # Browser language detection
│   ├── interpolation.md     # Variable interpolation
│   ├── typed-config.md      # Type-safe configuration
│   └── devtools.md          # Developer tools
├── api/                      # API reference
│   ├── server.md            # Server-side API
│   ├── client.md            # Client-side API
│   └── types.md             # TypeScript types
└── releases/                 # Release notes
    ├── v2.7.0.md            # Historical release note
    ├── v2.6.0.md            # Variable interpolation
    ├── v2.5.2.md            # Developer tools
    └── v2.1.0.md            # Server components
```

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

---

## Support

### Getting Help

- 📖 [Documentation](https://github.com/manNomi/i18nexus/tree/main/packages/i18nexus/docs)
- 🐛 [Issue Tracker](https://github.com/manNomi/i18nexus/issues)
- 💬 [Discussions](https://github.com/manNomi/i18nexus/discussions)

### Community

- ⭐ [Star on GitHub](https://github.com/manNomi/i18nexus)
- 🐦 [Follow Updates](#)
- 💡 [Feature Requests](https://github.com/manNomi/i18nexus/issues/new)

---

## License

MIT License - see [LICENSE](../LICENSE) for details.

---

<div align="center">

**Made with ❤️ for the React community**

[⭐ Star us on GitHub](https://github.com/manNomi/i18nexus) • [📦 View on npm](https://www.npmjs.com/package/i18nexus)

</div>
