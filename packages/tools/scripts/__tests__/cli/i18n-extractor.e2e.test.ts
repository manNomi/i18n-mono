/**
 * i18n-extractor CLI E2E 테스트
 * 실제 CLI 명령어 실행 검증
 */

import * as fs from "fs";
import * as path from "path";
import {
  runCLICommand,
  createTestProject,
  createTestConfig,
  createTempDir,
  cleanupDir,
  fileExists,
  readJsonFile,
  readFileContent,
  CLIResult,
} from "../cli-test-utils";

function getValueByDotOrLiteral(obj: Record<string, any>, key: string): any {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key];
  }
  return key.split(".").reduce((acc: any, part) => acc?.[part], obj);
}

describe("i18n-extractor CLI E2E", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupDir(tempDir);
  });

  describe("기본 실행", () => {
    it("새 키를 추출하여 번역 파일을 생성해야 함", async () => {
      // 테스트 프로젝트 생성
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("welcome.title")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir, {
        sourcePattern: "src/**/*.{ts,tsx}",
        localesDir: "./locales",
      });

      // CLI 실행
      const result = await runCLICommand("i18n-extractor", [], projectDir);

      // 에러가 발생하면 출력 확인
      if (result.exitCode !== 0) {
        console.log("STDOUT:", result.stdout);
        console.log("STDERR:", result.stderr);
      }

      expect(result.exitCode).toBe(0);
      expect(fileExists(path.join(projectDir, "locales", "ko.json"))).toBe(
        true
      );
      expect(fileExists(path.join(projectDir, "locales", "en.json"))).toBe(
        true
      );

      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(koData["welcome.title"]).toBeDefined();
    });

    it("defaultLanguage가 en이면 en.json에 원문을 채워야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";

            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("Dashboard")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir, {
        sourcePattern: "src/**/*.{ts,tsx}",
        localesDir: "./locales",
        defaultLanguage: "en",
        languages: ["en", "ko"],
      });

      const result = await runCLICommand("i18n-extractor", [], projectDir);

      expect(result.exitCode).toBe(0);
      const enData = readJsonFile(path.join(projectDir, "locales", "en.json"));
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(enData["Dashboard"]).toBe("Dashboard");
      expect(koData["Dashboard"]).toBe("");
    });

    it("여러 키를 추출해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return (
                <div>
                  {t("greeting")}
                  {t("farewell")}
                </div>
              );
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand("i18n-extractor", [], projectDir);

      expect(result.exitCode).toBe(0);
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(koData).toHaveProperty("greeting");
      expect(koData).toHaveProperty("farewell");
    });

    it("safe 모드에서 명시적인 const 문자열/객체/배열 map 정적 번역 키를 추출해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";

            const titleKey = "home.title";
            const HOME_I18N_KEYS = {
              subtitle: "home.subtitle",
              cta: "home.cta",
            } as const;
            const NAV_I18N_KEYS = ["nav.home", "nav.settings"] as const;

            export default function Component() {
              const { t } = useTranslation();
              return (
                <div>
                  <h1>{t(titleKey)}</h1>
                  <p>{t(HOME_I18N_KEYS.subtitle)}</p>
                  <button>{t(HOME_I18N_KEYS["cta"])}</button>
                  {NAV_I18N_KEYS.map((item) => (
                    <span key={item}>{t(item)}</span>
                  ))}
                </div>
              );
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand("i18n-extractor", [], projectDir);

      if (result.exitCode !== 0) {
        console.log("STDOUT:", result.stdout);
        console.log("STDERR:", result.stderr);
      }

      expect(result.exitCode).toBe(0);
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));

      expect(getValueByDotOrLiteral(koData, "home.title")).toBeDefined();
      expect(getValueByDotOrLiteral(koData, "home.subtitle")).toBeDefined();
      expect(getValueByDotOrLiteral(koData, "home.cta")).toBeDefined();
      expect(getValueByDotOrLiteral(koData, "nav.home")).toBeDefined();
      expect(getValueByDotOrLiteral(koData, "nav.settings")).toBeDefined();
    });

    it("safe 모드에서 일반 객체 property는 정적이어도 추출하지 않아야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";

            const response = {
              label: "home.fromResponse",
            } as const;

            export default function Component() {
              const { t } = useTranslation();
              return <div>{t(response.label)}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand("i18n-extractor", [], projectDir);

      expect(result.exitCode).toBe(0);
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(
        getValueByDotOrLiteral(koData, "home.fromResponse")
      ).toBeUndefined();
    });

    it("aggressive 모드에서 정적 일반 객체 property를 추출해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";

            const response = {
              label: "home.fromResponse",
            } as const;

            export default function Component() {
              const { t } = useTranslation();
              return <div>{t(response.label)}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir, {
        staticKeyExtraction: "aggressive",
      });

      const result = await runCLICommand("i18n-extractor", [], projectDir);

      expect(result.exitCode).toBe(0);
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(getValueByDotOrLiteral(koData, "home.fromResponse")).toBeDefined();
    });

    it("--library 옵션 값이 없으면 실패해야 함", async () => {
      const projectDir = createTestProject(tempDir, {});

      const result = await runCLICommand(
        "i18n-extractor",
        ["--library"],
        projectDir
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr || result.stdout).toContain(
        "Missing value for option: --library"
      );
    });

    it("--static-key-extraction off는 const 문자열 키를 추출하지 않아야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";

            const titleKey = "home.title";

            export default function Component() {
              const { t } = useTranslation();
              return (
                <div>
                  {t(titleKey)}
                  {t("home.subtitle")}
                </div>
              );
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand(
        "i18n-extractor",
        ["--static-key-extraction", "off"],
        projectDir
      );

      expect(result.exitCode).toBe(0);
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(getValueByDotOrLiteral(koData, "home.title")).toBeUndefined();
      expect(getValueByDotOrLiteral(koData, "home.subtitle")).toBeDefined();
    });
  });

  describe("옵션 테스트", () => {
    it("--force 옵션으로 기존 번역을 덮어써야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("new.key")}</div>;
            }
          `,
        },
        locales: {
          "ko.json": JSON.stringify({ old: "기존 값" }, null, 2),
          "en.json": JSON.stringify({ old: "Old Value" }, null, 2),
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand(
        "i18n-extractor",
        ["--force"],
        projectDir
      );

      expect(result.exitCode).toBe(0);
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(koData["old"]).toBeUndefined();
      expect(koData["new.key"]).toBeDefined();
    });

    it("--dry-run 옵션으로 파일을 생성하지 않아야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("test.key")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand(
        "i18n-extractor",
        ["--dry-run"],
        projectDir
      );

      expect(result.exitCode).toBe(0);
      expect(fileExists(path.join(projectDir, "locales", "ko.json"))).toBe(
        false
      );
    });

    it("--format csv 옵션으로 CSV 파일을 생성해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("hello.world")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand(
        "i18n-extractor",
        ["--format", "csv", "--output", "translations.csv"],
        projectDir
      );

      expect(result.exitCode).toBe(0);
      const csvFile = path.join(projectDir, "locales", "translations.csv");
      expect(fileExists(csvFile)).toBe(true);

      const csvContent = readFileContent(csvFile);
      expect(csvContent).toContain("Key,English,Korean");
      expect(csvContent).toContain("hello.world");
    });

    it("--languages 옵션으로 지정한 언어 파일만 생성해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("test")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand(
        "i18n-extractor",
        ["--languages", "en,ja"],
        projectDir
      );

      expect(result.exitCode).toBe(0);
      expect(fileExists(path.join(projectDir, "locales", "en.json"))).toBe(
        true
      );
      expect(fileExists(path.join(projectDir, "locales", "ja.json"))).toBe(
        true
      );
      expect(fileExists(path.join(projectDir, "locales", "ko.json"))).toBe(
        false
      );
    });

    it("--pattern 옵션으로 소스 파일 패턴을 지정할 수 있어야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        app: {
          "page.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Page() {
              const { t } = useTranslation();
              return <div>{t("app.key")}</div>;
            }
          `,
        },
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("src.key")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand(
        "i18n-extractor",
        ["--pattern", "app/**/*.tsx"],
        projectDir
      );

      expect(result.exitCode).toBe(0);
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(getValueByDotOrLiteral(koData, "app.key")).toBeDefined();
      expect(getValueByDotOrLiteral(koData, "src.key")).toBeUndefined();
    });

    it("--translation-import-source 옵션을 타입 생성에 전달해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "react-i18next";

            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("profile.title")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir, {
        generateTypes: true,
      });

      const result = await runCLICommand(
        "i18n-extractor",
        ["--translation-import-source", "react-i18next"],
        projectDir
      );

      expect(result.exitCode).toBe(0);

      const typeFile = path.join(
        projectDir,
        "locales",
        "types",
        "i18nexus.d.ts"
      );
      const typeContent = readFileContent(typeFile);

      expect(typeContent).toContain('declare module "react-i18next"');
      expect(typeContent).not.toContain("from 'i18nexus'");
    });
  });

  describe("네임스페이스 모드", () => {
    it("네임스페이스 모드에서 네임스페이스별 파일을 생성해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        "src/app": {
          dashboard: {
            "page.tsx": `
              import { useTranslation } from "i18nexus";
              
              export default function Page() {
                const { t } = useTranslation("dashboard");
                return <div>{t("dashboard.title")}</div>;
              }
            `,
          },
        },
      });

      createTestConfig(projectDir, {
        sourcePattern: "src/**/*.{ts,tsx}",
        namespacing: {
          enabled: true,
          basePath: "src/app",
          defaultNamespace: "common",
          framework: "nextjs-app",
          strategy: "first-folder",
        },
      });

      const result = await runCLICommand("i18n-extractor", [], projectDir);

      expect(result.exitCode).toBe(0);
      const dashboardKoFile = path.join(
        projectDir,
        "locales",
        "dashboard",
        "ko.json"
      );
      expect(fileExists(dashboardKoFile)).toBe(true);

      const koData = readJsonFile(dashboardKoFile);
      expect(koData["dashboard.title"]).toBeDefined();
    });
  });

  describe("에러 처리", () => {
    it("잘못된 옵션은 에러를 반환해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("test")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand(
        "i18n-extractor",
        ["--invalid-option"],
        projectDir
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Unknown option");
    });

    it("소스 파일이 없을 때 경고를 출력해야 함", async () => {
      const projectDir = createTestProject(tempDir, {});

      createTestConfig(projectDir, {
        sourcePattern: "nonexistent/**/*.tsx",
      });

      const result = await runCLICommand("i18n-extractor", [], projectDir);

      // 파일이 없어도 에러는 아니지만 경고는 출력
      expect((result.stdout + result.stderr).length).toBeGreaterThan(0);
    });

    it("잘못된 format 옵션은 에러를 반환해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("test")}</div>;
            }
          `,
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand(
        "i18n-extractor",
        ["--format", "invalid"],
        projectDir
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid format");
    });
  });

  describe("기존 번역 파일 병합", () => {
    it("기존 번역을 유지하고 새 키만 추가해야 함", async () => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Component.tsx": `
            import { useTranslation } from "i18nexus";
            
            export default function Component() {
              const { t } = useTranslation();
              return <div>{t("new.key")}</div>;
            }
          `,
        },
        locales: {
          "ko.json": JSON.stringify(
            { existing: "기존 키", "new.key": "이미 있음" },
            null,
            2
          ),
        },
      });

      createTestConfig(projectDir);

      const result = await runCLICommand("i18n-extractor", [], projectDir);

      expect(result.exitCode).toBe(0);
      const koData = readJsonFile(path.join(projectDir, "locales", "ko.json"));
      expect(koData).toHaveProperty("existing");
      expect(getValueByDotOrLiteral(koData, "new.key")).toBeDefined();
    });
  });
});
