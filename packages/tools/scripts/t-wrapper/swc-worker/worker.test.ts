import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { SCRIPT_CONFIG_DEFAULTS } from "../../common/default-config";
import { processWorkerTask } from "./worker";

describe("SWC worker processWorkerTask", () => {
  const originalCwd = process.cwd();
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-swc-"));
    process.chdir(projectDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it("updates an existing useTranslation namespace without translatable text", () => {
    const pagePath = path.join(projectDir, "app", "about", "page.tsx");
    fs.mkdirSync(path.dirname(pagePath), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "i18nexus.config.json"),
      JSON.stringify({
        namespacing: {
          enabled: true,
          basePath: path.join(projectDir, "app"),
          defaultNamespace: "common",
          framework: "nextjs-app",
        },
      })
    );
    const code = `import { useTranslation } from "i18nexus";
export default function AboutPage() {
  const { t } = useTranslation();
  return <div>{t("already.wrapped")}</div>;
}`;
    fs.writeFileSync(pagePath, code);

    const result = processWorkerTask({
      type: "process-file",
      filePath: pagePath,
      code,
      config: { ...SCRIPT_CONFIG_DEFAULTS },
    });

    expect(result).toMatchObject({ type: "success", modified: true });
    expect(fs.readFileSync(pagePath, "utf8")).toContain(
      'useTranslation("about")'
    );
  });
});
