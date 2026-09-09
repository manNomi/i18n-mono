import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface PackageJson {
  bin: Record<string, string>;
}

function getToolsRoot(): string {
  return path.resolve(__dirname, "../../..");
}

function readPackageJson(): PackageJson {
  return JSON.parse(
    fs.readFileSync(path.join(getToolsRoot(), "package.json"), "utf-8")
  );
}

describe("published bin smoke tests", () => {
  const packageJson = readPackageJson();

  it.each(Object.entries(packageJson.bin))(
    "%s --help exits successfully",
    (binName, binTarget) => {
      const toolsRoot = getToolsRoot();
      const binPath = path.join(toolsRoot, binTarget);
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-bin-"));

      try {
        const result = childProcess.spawnSync("node", [binPath, "--help"], {
          cwd,
          env: { ...process.env, NODE_ENV: "test" },
          encoding: "utf-8",
        });

        expect(result.status).toBe(0);
        expect(result.stderr).not.toContain("MODULE_NOT_FOUND");
        expect(result.stdout).toMatch(new RegExp(binName));
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    }
  );
});
