import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "./logger.js";
import { createCampusServer } from "./server.js";

async function main(): Promise<void> {
  const server = createCampusServer();
  const transport = new StdioServerTransport();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("server.shutdown", { signal });
    try {
      await server.close();
    } catch (error) {
      logger.error("server.shutdown.error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  transport.onerror = (error) => {
    logger.error("transport.error", { error: error.message });
  };

  await server.connect(transport);
  logger.info("server.ready", {
    transport: "stdio",
    pid: process.pid,
  });
}

main().catch((error) => {
  logger.error("server.fatal", {
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });
  process.exit(1);
});
