import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { analyzeProject } from "./project-analysis";
import { setupProject } from "./setup";
import { runI18nexusTool } from "./tool-runner";
import { validateProjectSetup } from "./validation";

function success(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
  };
}

export function createI18nexusMcpServer(): McpServer {
  const server = new McpServer({
    name: "i18nexus-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "analyze_i18nexus_project",
    {
      title: "Analyze i18nexus project setup",
      description:
        "Inspect a local project without changing it. Detect the framework, package manager, source paths, existing i18nexus config, and both declared and installed dependency status. Returns a suggested config.",
      inputSchema: z.object({
        projectPath: z
          .string()
          .optional()
          .describe(
            "Project directory. Defaults to the MCP server working directory."
          ),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectPath }) => {
      try {
        return success(analyzeProject(projectPath ?? process.cwd()));
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "setup_i18nexus",
    {
      title: "Set up i18nexus",
      description:
        "Prepare or apply i18nexus setup. It merges i18nexus.config.json, adds non-conflicting i18n scripts, and creates empty initial locale files. dryRun defaults to true. Dependency installation runs only when installDependencies is explicitly true.",
      inputSchema: z.object({
        projectPath: z
          .string()
          .optional()
          .describe(
            "Project directory. Defaults to the MCP server working directory."
          ),
        languages: z
          .array(z.string())
          .optional()
          .describe(
            "Language identifiers. Defaults to ko and en for a new config."
          ),
        defaultLanguage: z.string().optional(),
        sourceLanguage: z.string().optional(),
        packageManager: z.enum(["npm", "pnpm", "yarn"]).optional(),
        dryRun: z
          .boolean()
          .optional()
          .describe("Preview changes when true. Defaults to true."),
        overwriteExistingConfig: z
          .boolean()
          .optional()
          .describe(
            "Replace known config values with detected suggestions. Unknown existing values remain preserved."
          ),
        installDependencies: z
          .boolean()
          .optional()
          .describe(
            "Run package manager commands for i18nexus and i18nexus-tools. Defaults to false."
          ),
        updatePackageScripts: z
          .boolean()
          .optional()
          .describe(
            "Add missing i18n scripts to package.json. Defaults to true."
          ),
        createLocaleFiles: z
          .boolean()
          .optional()
          .describe(
            "Create empty locale JSON files when absent. Defaults to true."
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        return success(
          await setupProject({
            ...input,
            projectPath: input.projectPath ?? process.cwd(),
          })
        );
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "run_i18nexus_tool",
    {
      title: "Plan or run an installed i18nexus tool",
      description:
        "Plan or run a typed i18nexus-tools action from the target project's local node_modules. Arbitrary commands are not accepted. doctor runs immediately. extractor, clean-legacy, upload, and download use native dry-run in preview mode. wrapper and type return a plan until applyChanges is explicitly true. Google Sheets actions require configured service-account credentials and spreadsheet access.",
      inputSchema: z.object({
        projectPath: z
          .string()
          .optional()
          .describe(
            "Project directory. Defaults to the MCP server working directory."
          ),
        tool: z.enum([
          "doctor",
          "wrapper",
          "extractor",
          "type",
          "clean-legacy",
          "upload",
          "download",
        ]),
        applyChanges: z
          .boolean()
          .optional()
          .describe(
            "Apply local file or Google Sheets changes. Defaults to false. Native dry-run tools execute in preview mode. doctor still executes because it is an inspection command."
          ),
        pattern: z.string().min(1).max(4_096).optional(),
        languages: z
          .array(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/))
          .min(1)
          .optional(),
        sourceLanguage: z
          .string()
          .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
          .optional(),
        outputDir: z.string().min(1).optional(),
        outputFormat: z.enum(["json", "csv"]).optional(),
        outputFile: z.string().min(1).optional(),
        localesDir: z.string().min(1).optional(),
        translationImportSource: z.string().min(1).optional(),
        typesOutputPath: z.string().min(1).optional(),
        staticKeyExtraction: z.enum(["off", "safe", "aggressive"]).optional(),
        force: z.boolean().optional(),
        flat: z.boolean().optional(),
        generateTypes: z.boolean().optional(),
        strictTypes: z.boolean().optional(),
        keyFirst: z.boolean().optional(),
        keyFirstPattern: z.string().min(1).max(4_096).optional(),
        backup: z.boolean().optional(),
        spreadsheetId: z.string().min(1).optional(),
        credentialsPath: z.string().min(1).optional(),
        autoTranslate: z.boolean().optional(),
        timeoutMs: z.number().int().min(1_000).max(300_000).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        return success(
          await runI18nexusTool({
            ...input,
            projectPath: input.projectPath ?? process.cwd(),
          })
        );
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "validate_i18nexus_setup",
    {
      title: "Validate i18nexus setup",
      description:
        "Check the generated config, language invariants, initial locale files, manifest declarations, and actual node_modules installation without changing the project.",
      inputSchema: z.object({
        projectPath: z
          .string()
          .optional()
          .describe(
            "Project directory. Defaults to the MCP server working directory."
          ),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectPath }) => {
      try {
        return success(validateProjectSetup(projectPath ?? process.cwd()));
      } catch (error) {
        return failure(error);
      }
    }
  );

  return server;
}

export async function startStdioServer(): Promise<McpServer> {
  const server = createI18nexusMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
