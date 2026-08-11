import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from "fs";
import * as path from "path";
import {
  createFixture,
  installFakeI18nexusTools,
  removeFixture,
  writeJson,
} from "./fixture";

function textResult(result: unknown): unknown {
  if (!result || typeof result !== "object" || !("content" in result)) {
    throw new Error("MCP result did not contain content.");
  }
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    throw new Error("MCP result content was not an array.");
  }
  const textContent = content.find(
    (item): item is { type: "text"; text: string } =>
      Boolean(
        item &&
        typeof item === "object" &&
        "type" in item &&
        item.type === "text" &&
        "text" in item &&
        typeof item.text === "string"
      )
  );
  const text = textContent?.text;
  if (!text) throw new Error("MCP result did not contain text content.");
  return JSON.parse(text);
}

describe("i18nexus MCP stdio server", () => {
  it("lists and calls analysis, setup, and validation tools over MCP", async () => {
    const projectPath = createFixture("stdio");
    writeJson(path.join(projectPath, "package.json"), {
      dependencies: {
        next: "^15.0.0",
        react: "^18.0.0",
        i18nexus: "^4.0.1",
      },
      devDependencies: { "i18nexus-tools": "^3.2.0" },
    });
    writeJson(path.join(projectPath, "package-lock.json"), {
      lockfileVersion: 3,
    });
    fs.mkdirSync(path.join(projectPath, "src", "app"), { recursive: true });
    installFakeI18nexusTools(projectPath);

    const serverPath = path.resolve(
      __dirname,
      "../../dist/bin/i18nexus-mcp.js"
    );
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      stderr: "pipe",
    });
    const client = new Client({ name: "i18nexus-mcp-test", version: "1.0.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual([
        "analyze_i18nexus_project",
        "setup_i18nexus",
        "run_i18nexus_tool",
        "validate_i18nexus_setup",
      ]);

      const analysis = textResult(
        await client.callTool({
          name: "analyze_i18nexus_project",
          arguments: { projectPath },
        })
      ) as { framework: { kind: string } };
      expect(analysis.framework.kind).toBe("nextjs-app");

      const doctor = textResult(
        await client.callTool({
          name: "run_i18nexus_tool",
          arguments: { projectPath, tool: "doctor" },
        })
      ) as { execution: { status: string } };
      expect(doctor.execution.status).toBe("completed");

      const setup = textResult(
        await client.callTool({
          name: "setup_i18nexus",
          arguments: {
            projectPath,
            dryRun: false,
            installDependencies: false,
            staticKeyExtraction: "aggressive",
            keyFirst: { enabled: true, pattern: "^[a-z]+\\.[a-z]+$" },
          },
        })
      ) as { dryRun: boolean };
      expect(setup.dryRun).toBe(false);
      expect(
        fs.existsSync(path.join(projectPath, "i18nexus.config.json"))
      ).toBe(true);
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(projectPath, "i18nexus.config.json"),
            "utf8"
          )
        )
      ).toMatchObject({
        staticKeyExtraction: "aggressive",
        keyFirst: { enabled: true },
      });

      const csvPreview = textResult(
        await client.callTool({
          name: "run_i18nexus_tool",
          arguments: {
            projectPath,
            tool: "json-to-csv",
            csvFile: "./translations.csv",
            languages: ["ko", "en"],
          },
        })
      ) as { mode: string; command: { name: string; args: string[] } };
      expect(csvPreview).toMatchObject({
        mode: "preview",
        command: { name: "i18n-json-to-csv" },
      });
      expect(csvPreview.command.args).toContain("--dry-run");

      const validation = textResult(
        await client.callTool({
          name: "validate_i18nexus_setup",
          arguments: { projectPath },
        })
      ) as { valid: boolean };
      expect(validation.valid).toBe(true);
    } finally {
      await client.close();
      removeFixture(projectPath);
    }
  });
});
