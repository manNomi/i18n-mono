# 기능 점수표

이 문서는 i18nexus의 기능 폭을 같은 규칙으로 비교하기 위한 스냅샷이다.
`32/54`는 외부 보고서가 측정한 공개 npm release `i18nexus` 4.0.1 baseline이다.
`45/54`는 현재 worktree source와 local packed tarball로 검증한 미공개
release-candidate 점수다. npm에 설치되는 4.0.1에 ICU나 Edge가 포함되었다는
뜻이 아니며, publication과 versioning은 여기서 수행하지 않은 별도 release 작업이다.
점수는 제품의 전체 품질이나 도입 적합성을 뜻하지 않는다.

## 점수 규칙

| 점수 | 의미                                                                                   |
| ---: | -------------------------------------------------------------------------------------- |
|    2 | 패키지에 기본 제공되는 ready path가 있고, 일반 사용자가 별도 구현 없이 사용할 수 있다. |
|    1 | 부분 지원이다. plugin, 별도 설정, 또는 사용자 구현이 필요하다.                         |
|    0 | 지원하지 않는다.                                                                       |

## 전체 항목

baseline의 행 이름과 점수는 외부 보고서의 공개 4.0.1 표를 그대로 사용한다.
candidate는 현재 branch의 미공개 구현을 local packed tarball까지 검증한 수치다.
변경되지 않은 candidate 점수는 baseline과 같다.

| 기능                           | 공개 4.0.1 baseline | 미공개 candidate | 간단한 근거                           |
| ------------------------------ | ------------------: | ---------------: | ------------------------------------- |
| 문자열 interpolation           |                   2 |                2 | legacy `{{name}}` 유지                |
| cardinal plural                |                   0 |                2 | candidate ICU formatter               |
| ordinal plural                 |                   0 |                2 | candidate ICU formatter               |
| select와 context와 gender      |                   0 |                2 | candidate ICU formatter               |
| 숫자와 통화 포매팅             |                   0 |                2 | candidate `createFormatter`           |
| 날짜와 상대 시간과 list 포매팅 |                   0 |                2 | candidate `createFormatter`           |
| React rich text                |                   1 |                2 | candidate ICU `t.rich`                |
| namespace와 fallback           |                   2 |                2 | 기존 Provider와 server 경로           |
| catalog lazy loading           |                   2 |                2 | 기존 namespace loader                 |
| React client hook과 Provider   |                   2 |                2 | 기존 `I18nProvider`, `useTranslation` |
| 전통적인 SSR                   |                   2 |                2 | 기존 server translator                |
| React Server Components API    |                   2 |                2 | 기존 `getTranslation`                 |
| 언어 자동 감지                 |                   2 |                2 | cookie와 Accept-Language              |
| 언어 cookie 저장               |                   2 |                2 | 기존 language manager                 |
| locale routing                 |                   1 |                1 | 기존 URL helper 범위                  |
| localized pathname과 domain    |                   0 |                0 | routing 통합 미제공                   |
| Edge server runtime            |                   0 |                2 | candidate `i18nexus/edge`             |
| 번역 key 타입 검사             |                   2 |                2 | 기존 `createI18n`                     |
| key별 interpolation 변수 타입  |                   0 |                0 | key별 변수 추론 미제공                |
| key 추출 CLI                   |                   2 |                2 | 기존 i18nexus-tools                   |
| 하드코딩 JSX 자동 수정         |                   2 |                2 | 기존 wrapper                          |
| catalog 검사와 타입 생성       |                   2 |                2 | 기존 doctor와 type generator          |
| Google Sheets 직접 동기화      |                   2 |                2 | 기존 sheets workflow                  |
| 범용 TMS와 표준 format 생태계  |                   1 |                1 | 표준 ecosystem 폭은 제한적            |
| 시각적 React devtools          |                   2 |                2 | 기존 devtools                         |
| source-message authoring       |                   1 |                1 | source message 경로는 부분 지원       |
| React 밖의 여러 framework 지원 |                   0 |                0 | React 중심 API                        |

| 합계                 | 공개 4.0.1 baseline | 미공개 candidate | 변화 |
| -------------------- | ------------------: | ---------------: | ---: |
| 27개 항목, 최대 54점 |        32/54 = 59.3 |     45/54 = 83.3 |  +13 |

변경된 7개 candidate 항목은 cardinal plural `0 -> 2`, ordinal plural
`0 -> 2`, select와 context와 gender `0 -> 2`, 숫자와 통화 포매팅 `0 -> 2`,
날짜와 상대 시간과 list 포매팅 `0 -> 2`, React rich text `1 -> 2`, Edge
server runtime `0 -> 2`다. 따라서 `45/54`는 배포된 registry 점수가 아니라
이번 구현 목표를 마친 release-candidate 점수다.

## 구현과 증거

ICU는 plural, ordinal, select, rich tag처럼 언어 규칙에 따라 메시지를
선택하거나 조합하는 국제 메시지 문법이다. 미공개 candidate는
`intl-messageformat` 11.2.13을 사용한다. manifest의 `packages/core/package.json`과
현재 local 설치 결과 `npm ls intl-messageformat --depth=0` 모두 같은 버전을
확인한다. 이 확인은 registry release의 새 기능 공개를 뜻하지 않는다.

| 기능                     | 구현 파일                                                                                | 실행 증거                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| ICU 메시지와 cache       | `packages/core/src/utils/icu-formatter.ts`, `message-formatter.ts`, `icu-server.ts`      | `packages/core/src/__tests__/icu.test.tsx`                 |
| ICU React candidate path | `packages/core/src/utils/icu.ts`, `icu-client.tsx`                                       | ICU provider, `t.rich`, `createIcuI18n` 테스트             |
| native Intl formatter    | `packages/core/src/utils/formatter.ts`, `hooks/useFormatter.ts`                          | `packages/core/src/__tests__/formatter.test.tsx`           |
| formatter 주입 parity    | `hooks/useTranslation.ts`, `utils/createI18n.ts`, `utils/server.ts`                      | ICU와 formatter 테스트                                     |
| Edge 번역                | `utils/locale-negotiation.ts`, `pure-translation.ts`, `edge.ts`                          | `packages/core/src/__tests__/edge.test.ts`                 |
| 패키지와 runtime 경계    | `scripts/smoke-packed-package.mjs`, `smoke-browser-bundle.mjs`, `smoke-edge-runtime.mjs` | packed TypeScript, Next RSC, browser bundle, Edge VM smoke |

packed smoke는 현재 source로 만든 local tarball을 임시 strict TypeScript 소비자에
설치해 candidate `i18nexus/icu`와 `i18nexus/edge`를 실제 import한다. 같은 smoke의
Next.js App Router fixture는 Server Component에서 ICU server translator를 실행한다.
이는 배포 전 release-candidate 검증이며, npm registry의 4.0.1 package 검증이 아니다.
Edge smoke는 `Headers`, `Intl`, `URL`, `TextEncoder`, `TextDecoder` 등의 Web
API만 가진 VM에서 cookie 협상, legacy 보간, number formatter, ICU plural을
실행한다. esbuild metafile과 Babel AST 검사는 Edge 번들에 Node builtin,
React, Next, Node 전역, 정적 dynamic import가 섞이지 않는지도 확인한다.

## 최종 검증 수치

아래 값은 Node 22 대표 검증 출력의 수치다. bundle은 esbuild 0.25.11과
gzip을 사용했고 React와 `react/jsx-runtime`은 legacy client root 측정에서
peer external로 처리했다. microbenchmark는 25 samples와 성공하는 hot path를
사용하므로 앱의 실제 화면 지연 시간 보장은 아니다.

| 검증                      | 결과                 |
| ------------------------- | -------------------- |
| 단위 테스트               | 13 suites, 163 tests |
| URL-only gzip             | 609 B                |
| legacy client root gzip   | 4,462 B              |
| feature 2 root delta      | 500 B                |
| standalone formatter gzip | 640 B                |
| ICU consumer gzip         | 10,985 B             |
| Edge base gzip            | 2,283 B              |
| Edge plus ICU gzip        | 11,549 B             |

| 번역 benchmark       | p50 microseconds/operation | p95 microseconds/operation |
| -------------------- | -------------------------: | -------------------------: |
| legacy interpolation |                     0.4312 |                     0.4848 |
| ICU cache hit        |                     2.4411 |                     2.8105 |
| ICU cold compile     |                    42.0765 |                    62.7040 |
| formatter cache hit  |                     0.8493 |                     0.9158 |

## Gate 이력

formatter 초기 gate는 standalone gzip 399 B를 목표로 했지만 폐기했다.
그 구현은 inherited, non-enumerable, accessor 옵션과 `null` 또는 primitive
options의 native `Intl` 동작을 보존하지 못했다. correctness를 우선해
cache-safe plain object만 cache하고 나머지는 native option lookup을 보존하는
경로로 바꿨다.

현재 hard gate는 URL-only 2,500 B 이하, legacy client root 4,500 B 이하,
feature 2 delta 500 B 이하, standalone formatter 700 B 이하, ICU 18,000 B
이하다. Edge base는 5,000 B 이하이고 Edge plus ICU는 18,000 B 이하다.
성능 gate는 legacy p50 0.55 microseconds/operation 이하, ICU cache hit 5
이하, ICU cold compile 100 이하, formatter cache hit 25 이하다.
legacy gate는 같은 환경에서 관측한 실행 간 편차를 허용하되 일반적인 p50을
크게 벗어나는 회귀를 잡도록 설정했다.

## 한계와 non-fit

현재 점수는 ICU, native Intl formatter, Edge 번역의 ready path를 보여준다.
그러나 localized pathname routing이 필요한 앱, key마다 서로 다른 변수
형식을 TypeScript로 강제해야 하는 앱, React 밖의 framework adapter가 필요한
앱에는 적합하지 않을 수 있다. routing, framework adapter, CMS connector
폭을 우선하는 팀은 생태계 성숙도가 높은 대안을 함께 비교해야 한다.

## 재현

Node 22를 활성화한 뒤 repository root에서 다음을 실행한다.

```bash
npx --yes --package=node@22 --call='npm test --workspace i18nexus -- --runInBand'
npx --yes --package=node@22 --call='npm run typecheck --workspace i18nexus'
npx --yes --package=node@22 --call='npm run lint --workspace i18nexus'
npx --yes --package=node@22 --call='npm run build --workspace i18nexus'
npx --yes --package=node@22 --call='npm run smoke:pack --workspace i18nexus'
npx --yes --package=node@22 --call='npm run smoke:bundle --workspace i18nexus'
npx --yes --package=node@22 --call='npm run smoke:edge --workspace i18nexus'
npx --yes --package=node@22 --call='npm run benchmark:translation --workspace i18nexus'
npx --yes --package=node@22 --call='npm ls intl-messageformat --workspace i18nexus --depth=0'
```

수치는 하드웨어, Node minor, dependency tree, 번들러에 따라 달라진다.
기계별 절대 경로나 고정 스냅샷은 이 문서에 넣지 않는다.

## 참고

외부 라이브러리 비교와 adoption 판단의 evidence는 이 branch의 adoption review
evidence와 검증 로그에 보관한다. 이 문서는 특정 기계의 snapshot path를 가리키지
않으며, 위 명령으로 만든 fresh output을 review evidence로 사용한다.
