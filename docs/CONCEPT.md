# i18nexus Concept

## One Sentence

**한국어:** i18nexus는 React/Next.js 팀을 위해 source의 번역 키, namespace JSON, 생성된 TypeScript 타입과 서버/클라이언트 번역 동작이 서로 어긋나지 않도록 연결하는 namespace 기반 i18n 런타임과 companion CLI다.

**English:** i18nexus is a namespace-based i18n runtime and companion CLI for React and Next.js teams that keeps source translation keys, locale JSON, generated TypeScript types, and server/client translation behavior aligned.

## Positioning Template

For React and Next.js teams whose translation calls, namespace files, generated types, lazy loading, and server/client paths repeatedly drift apart, i18nexus is a namespace-based runtime and companion CLI that extracts source keys, generates the matching resource/type contract, and consumes that contract in React and server APIs. Unlike combining a general-purpose runtime with unrelated custom scripts, it provides one repository-defined namespace shape across extraction, type generation, client hooks, and server helpers. It intentionally does not provide translation authoring, translation quality review, a hosted translation management service, or the full feature surface of i18next.

React/Next.js에서 번역 호출, namespace 파일, 생성 타입, lazy loading과 서버/클라이언트 경로가 반복적으로 어긋나는 팀을 위해, i18nexus는 source key 추출부터 같은 리소스/타입 계약 생성, React 및 서버 런타임 소비까지 연결하는 namespace 기반 런타임과 companion CLI다. 범용 런타임에 서로 무관한 자체 스크립트를 조합하는 방식과 달리 추출, 타입 생성, client hook, server helper가 저장소에서 정의한 하나의 namespace 형태를 공유한다. 번역 작성·품질 검수, hosted TMS, 또는 i18next의 전체 기능을 제공하는 것은 의도적인 비목표다.

## 30-Second Explanation

애플리케이션 국제화에서 자주 깨지는 경계는 `t("key")` 호출과 실제 locale 파일, TypeScript 선언, 서버/클라이언트 로딩 규칙 사이의 일치성이다. i18nexus는 `i18n-extractor`와 `i18n-type`으로 source에서 namespace 리소스와 타입을 만들고, `I18nProvider`/`useTranslation`/`createI18n` 및 `i18nexus/server`가 같은 namespace-by-language 구조를 소비하게 한다. 이 통합은 코드로 확인되지만 자동화 도구를 함께 운영해야 하고, plural/select/TMS 등 더 넓은 i18n 기능이 필요하면 범용 생태계가 더 적합할 수 있다.

## Primary User Problem

단일 핵심 문제는 **번역 key와 이를 둘러싼 여러 표현(source call, JSON resource, generated type, client/server runtime)이 독립적으로 변경되어 서로 다른 상태가 되는 것**이다.

기존 방식에서는 팀이 다음 비용을 부담한다.

- source 검색, locale 파일 생성과 타입 선언 갱신이 별도 수작업 또는 서로 다른 스크립트에 분산된다.
- client hook과 server translation의 namespace/fallback 규칙을 따로 이해하고 유지한다.
- 누락 key가 runtime에서 key 문자열로 조용히 노출되거나, 오래된 generated type이 잘못된 확신을 준다.
- legacy key 정리와 외부 번역 시트 동기화가 파일 덮어쓰기 및 부분 실패 위험을 만든다.

## How It Reduces That Cost

다음 메커니즘은 현재 코드에서 확인된다.

1. CLI extractor가 source의 번역 호출을 읽고 namespace별 locale 리소스를 생성·병합한다.
2. type generator가 같은 namespace/key 집합에서 TypeScript declaration을 생성한다.
3. core runtime이 `namespace -> language -> key -> string` 형태를 Provider, typed factory와 server helper에서 소비한다.
4. root/client, `i18nexus/server`, `i18nexus/devtools` entrypoint를 분리해 Node 파일 API가 client root import에 섞이지 않게 한다.
5. fallback namespace, lazy namespace loader, server resource loading과 cache invalidation을 명시적 API로 제공한다.

Claims CLM-010, CLM-011, CLM-016과 후속 Behavior Contract가 이 메커니즘의 검증 상태를 추적한다.

## Target Users

- namespace 단위로 locale 파일을 관리하는 React 또는 Next.js TypeScript 팀
- client component와 server component에서 같은 번역 모델을 사용하려는 팀
- 번역 키 추출, 타입 생성, legacy cleanup을 CI 또는 agent workflow로 자동화하려는 팀
- Google Sheets 동기화를 선택적으로 사용하되 로컬 JSON을 애플리케이션 artifact로 유지하려는 팀

## Core Use Cases

- source의 `t()` 호출에서 locale skeleton과 key type 생성
- typed translation object로 namespace/key autocomplete를 제공하는 `createI18n`
- Provider 기반 client translation과 lazy namespace loading
- Next.js server code에서 Accept-Language/cookie 기반 language 선택과 namespace 로딩
- 사용하지 않는 locale key의 검출·정리
- locale JSON과 Google Sheets 사이의 업로드/다운로드 workflow

## Responsibilities

### Library and CLI

- 문서화된 namespace/resource shape 처리
- 공개 API의 missing key, fallback, interpolation, loading 및 error behavior
- CLI가 변경할 파일의 탐색, 파싱, 생성과 exit status
- 배포 package의 exports, declarations와 executable bin 제공

### Application

- 지원 language와 default language 선택
- 실제 번역 문구의 정확성 및 승인
- 사용자/요청에서 locale을 얻는 정책과 cookie/header 전달
- lazy loader와 외부 인증 정보 제공
- 생성 파일을 언제 실행·검토·커밋할지 결정
- HTML/React 출력에 포함하는 번역 문자열과 interpolation 값의 신뢰 경계 관리

## Intentional Non-Goals

- 번역가용 편집 UI, review/approval workflow 또는 hosted TMS
- 기계 번역과 번역 품질 평가
- locale negotiation 전체 표준 구현을 자동으로 대신하는 것
- ICU MessageFormat 전체, gender/select 또는 모든 pluralization 규칙을 자체 구현하는 것
- 애플리케이션 routing, authentication, cookie consent 또는 observability 정책 소유
- i18next/react-i18next와 완전한 API 호환성

## When to Choose It

- React/Next.js와 TypeScript가 주 환경이고 namespace JSON을 source 가까이에 유지하려 한다.
- key extraction, type generation과 runtime shape를 하나의 도구 체인으로 맞추는 문제가 크다.
- server/client translation을 동일 package의 명시적 entrypoint로 사용하려 한다.
- CLI가 locale 파일을 생성·수정하는 workflow를 코드 리뷰와 CI에 포함할 수 있다.
- 현재 Behavior Contract와 compatibility matrix의 제한을 수용할 수 있다.

## When Not to Choose It

- ICU plural/select, locale negotiation, plugin ecosystem과 검증된 광범위한 framework adapter가 핵심이다.
- 번역가 중심 hosted TMS와 실시간 content delivery가 제품 요구사항이다.
- React/Next.js 이외의 여러 UI framework를 하나의 runtime으로 지원해야 한다.
- 생성 도구가 source/locale 파일을 수정하는 운영 모델을 허용할 수 없다.
- CJS-only, edge-only, Windows 또는 다른 미검증 환경의 보장이 도입 전 필수다.
- runtime과 CLI dependency/security 위험을 현재 허용할 수 없다.

## Alternatives

| Alternative                                             | Better fit when                                                         | i18nexus difference that can be tested                                                                  | Cost of choosing i18nexus                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `i18next` + `react-i18next`                             | broad plugin ecosystem, mature locale features and adapters are primary | i18nexus repository includes source wrapper/extractor/type/cleanup tools tied to its namespace shape    | smaller ecosystem; more behavior is project-specific and must be verified here |
| Framework-specific i18n such as Next-oriented libraries | routing, middleware and framework locale negotiation dominate           | i18nexus keeps React client and explicit server translation entrypoints independent of router ownership | application owns routing/locale negotiation integration                        |
| Custom scripts + JSON + React context                   | team needs a very small bespoke surface and can own it                  | i18nexus provides packaged extraction, generated types, cleanup, sync and tests                         | adopting its file/config conventions and CLI dependency graph                  |
| Hosted TMS SDK                                          | translator workflow, remote delivery and approval are primary           | i18nexus can keep runtime resources local and optionally sync Sheets                                    | no hosted authoring/review service; team owns release of translations          |

No claim is made here that i18nexus is universally faster, smaller, safer, or more complete than these alternatives.

## Trade-offs and Operating Cost

- The runtime and tools are versioned separately and must remain compatible.
- Generated locale/type files can drift if extractor/type commands are not part of CI.
- File-mutating CLI commands require review, backup/version control, path validation and atomicity guarantees.
- Google Sheets support introduces credentials, network, quota and dependency risk.
- The support policy is intentionally limited to the executable matrix: Node
  22/24/26 and React 18/19. Expanding it requires installed-consumer evidence,
  manifest updates and CI coverage.
- Missing translations currently favor graceful key return in several paths, which avoids a crash but can hide release defects unless the application adds monitoring or strict checks.

## Migration and Exit

### Adopting

1. Start with one namespace and static translations.
2. Add Provider/client or server helper without enabling file mutation.
3. Run extractor/type generation in dry or reviewed changes where available.
4. Add CI checks for generated diff, package types and missing keys.
5. Enable optional lazy loading or Sheets sync only after failure behavior is accepted.

### Leaving

- Locale files are plain JSON grouped by namespace/language and can be mapped to another runtime.
- `t(key, variables)` calls are conventional enough for AST or codemod migration, but provider/hooks/server imports must be replaced.
- Remove generated `i18nexus.d.ts` augmentation and replace its key types with the destination library's types.
- Replace `i18nexus-tools` scripts in CI before removing the package so locale/type generation does not silently stop.
- Export/download any Google Sheets-backed translations to local JSON and revoke service credentials.

Exit cost is proportional to use of i18nexus-specific lazy loaders, typed factory APIs and CLI-generated conventions; it is not zero.

## Concept Candidates Considered

| Candidate                               | Implementation fit | Problem strength | Differentiation |  Simplicity | Long-term cost | Provability | Decision                                                    |
| --------------------------------------- | -----------------: | ---------------: | --------------: | ----------: | -------------: | ----------: | ----------------------------------------------------------- |
| A. Type-safe React translation runtime  |               High |           Medium |      Low-Medium |        High |         Medium |        High | Secondary: describes core but not the monorepo advantage    |
| B. Source-to-runtime namespace contract |               High |             High |            High | Medium-High |         Medium |        High | **Primary**                                                 |
| C. AI-agent-friendly i18n automation    |             Medium |           Medium |          Medium |      Medium |           High |         Low | Rejected as primary until repeatable agent benchmarks exist |

Candidate B remains distinguishable after removing the product name: source extraction, namespace resource generation, type declaration generation and server/client consumption share one shape. Candidate C currently depends mostly on workflow documentation rather than a unique runtime behavior.

## Verified Differentiators

- Source extraction and generated TypeScript declarations exist in the companion CLI and have unit/integration tests.
- Client, server and devtools are separate package entrypoints in the core manifest.
- Static typed factory, Provider/hook runtime, lazy namespace loader and server helper consume namespace-oriented resources.
- CLI includes cleanup and optional Google Sheets workflows in addition to extraction/type generation.

These differentiators are exercised by source and installed-artifact gates. Their
exact coverage and remaining environment limits are tracked in
`docs/BEHAVIOR_CONTRACT.md` and `.loop/EVIDENCE.md`.

## Unverified or Rejected Claims

- `zero runtime overhead`: no comparative bundle/runtime benchmark proves zero overhead.
- `zero configuration`: the documented workflow requires provider/resource setup and most CLI usage requires config conventions.
- universal `faster`, `smaller`, or `more efficient` comparisons: bundle and
  translation baselines exist, but there is no controlled comparison against
  alternative libraries or representative application latency.
- broad Next.js 14+, Server Actions, edge/serverless, browser and HMR support: not all declared combinations are in the compatibility matrix yet.
- AI agents reduce setup time or error rate: no controlled evaluation proves this.
- full type safety: generated types and `createI18n` cover defined paths, while the beginner API and stale generation can still permit runtime misses.

Until executable evidence is added, these claims must not be used as adoption reasons.
