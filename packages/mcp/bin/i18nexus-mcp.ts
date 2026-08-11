#!/usr/bin/env node

import { startStdioServer } from "../src/server";

async function main(): Promise<void> {
  const server = await startStdioServer();
  console.error("i18nexus MCP server is running on stdio");

  process.once("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Failed to start i18nexus MCP server:", error);
  process.exit(1);
});
