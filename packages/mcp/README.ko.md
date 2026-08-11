# i18nexus MCP

`i18nexus-mcp`는 React 또는 Next.js 프로젝트를 분석하고 프로젝트 구조에 맞는 i18nexus 설정을 준비하는 로컬 Model Context Protocol 서버입니다.

이 서버는 `package.json`과 라우트 폴더를 보고 프레임워크를 찾습니다. lockfile을 보고 npm과 pnpm과 Yarn 중 어떤 패키지 관리자를 쓰는지도 찾습니다. 확인한 구조를 바탕으로 소스 탐색 경로와 네임스페이스 기준 경로와 locale 파일 위치를 제안합니다.

## 실행 조건

- Node.js 20 이상이 필요합니다.
- 로컬 stdio 서버를 지원하는 MCP host가 필요합니다.
- 스크립트나 의존성을 바꾸려면 대상 프로젝트에 올바른 `package.json`이 있어야 합니다.

## 이 저장소에서 실행하기

```bash
npm install
npm run build --workspace=i18nexus-mcp
node packages/mcp/dist/bin/i18nexus-mcp.js
```

서버는 표준 입력과 표준 출력으로 MCP 메시지를 주고받습니다. 시작 안내와 오류는 표준 오류로만 출력하므로 MCP 메시지를 깨뜨리지 않습니다.

## MCP host 설정

먼저 패키지를 빌드합니다. 그다음 생성된 실행 파일의 절대 경로를 MCP host 설정에 넣습니다.

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

패키지를 배포한 뒤에는 `npx`와 `i18nexus-mcp`를 실행 명령으로 사용할 수 있습니다.

## 제공 도구

### `analyze_i18nexus_project`

이 도구는 파일을 바꾸지 않습니다. `projectPath`를 받아 프레임워크와 패키지 관리자와 소스 경로와 라우트 경로와 현재 config와 의존성 상태를 확인합니다. 확인 결과와 함께 추천 config를 반환합니다.

`package.json`에 의존성이 적혀 있는 상태와 실제 `node_modules`에 설치된 상태를 나누어 알려줍니다. 따라서 선언만 있고 설치되지 않은 경우도 구분할 수 있습니다.

### `setup_i18nexus`

이 도구는 `i18nexus.config.json`을 만들거나 보완합니다. 필요한 경우 `package.json`에 i18n 명령을 추가하고 첫 locale 파일도 만듭니다.

`dryRun`의 기본값은 `true`입니다. 반환된 파일 변경 계획을 확인한 뒤 실제 반영이 필요할 때만 `dryRun: false`를 전달합니다. 기존 config의 값과 기존 package script는 그대로 보존합니다. 감지한 추천값으로 기존 설정을 바꾸려면 `overwriteExistingConfig`를 명시해야 합니다.

의존성 설치는 기본적으로 실행하지 않습니다. `installDependencies: true`를 전달하면 감지한 패키지 관리자로 `i18nexus`를 일반 의존성에 설치하고 `i18nexus-tools`를 개발 의존성에 설치합니다. lockfile이 두 개 이상이면 `packageManager`도 함께 전달해야 합니다.

실제로 설정을 적용하는 인자 예시는 다음과 같습니다.

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

이 도구는 파일을 바꾸지 않습니다. config 형식과 언어 설정과 소스 탐색 경로와 첫 locale 파일을 검사합니다. `package.json`의 의존성 선언과 실제 설치 상태도 따로 검사합니다.

## setup이 만드는 파일

Next.js App Router 프로젝트에는 보통 다음 파일이 생깁니다.

```text
i18nexus.config.json
locales/
  common/
    ko.json
    en.json
```

기존 명령과 이름이 겹치지 않으면 다음 script를 `package.json`에 추가합니다.

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

## 현재 구현 범위

MCP 서버는 i18nexus config와 첫 locale 파일까지 준비합니다. 애플리케이션 provider나 component는 자동으로 바꾸지 않습니다. 이 부분은 프로젝트마다 렌더링 방식과 상태 경계가 달라 별도 판단이 필요하기 때문입니다. Google service account 자격 증명도 만들지 않습니다.

setup 도구는 확인한 프로젝트 폴더 안의 config와 locale 경로만 수정합니다. 기존 JSON config가 올바르지 않으면 `overwriteExistingConfig`를 명시하기 전까지 덮어쓰지 않습니다.
