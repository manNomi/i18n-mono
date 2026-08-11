import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { analyzeProject } from "./project-analysis";
import { setupProject } from "./setup";
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
