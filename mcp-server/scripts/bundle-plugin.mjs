import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mcpServerRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(mcpServerRoot, "..");
const pluginRoot = path.join(repoRoot, "plugins", "campus-helpdesk");

const entryPoint = path.join(mcpServerRoot, "src", "index.ts");
const bundleOutFile = path.join(
  pluginRoot,
  "servers",
  "campus-helpdesk-mcp.mjs"
);
const sourceRulesPath = path.join(mcpServerRoot, "data", "hostel_rules.md");
const pluginRulesPath = path.join(pluginRoot, "data", "hostel_rules.md");
const packageJsonPath = path.join(mcpServerRoot, "package.json");

async function run() {
  const pkgRaw = await readFile(packageJsonPath, "utf8");
  const pkg = JSON.parse(pkgRaw);
  const version = typeof pkg.version === "string" ? pkg.version : "0.2.0";

  await mkdir(path.dirname(bundleOutFile), { recursive: true });
  await mkdir(path.dirname(pluginRulesPath), { recursive: true });

  await build({
    entryPoints: [entryPoint],
    outfile: bundleOutFile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    sourcemap: false,
    logLevel: "info",
    define: {
      __PACKAGE_VERSION__: JSON.stringify(version),
    },
    banner: {
      js: [
        "#!/usr/bin/env node",
        "import { createRequire as __createRequire } from 'node:module';",
        "const require = __createRequire(import.meta.url);",
      ].join("\n"),
    },
  });

  await copyFile(sourceRulesPath, pluginRulesPath);

  console.error(
    `[bundle-plugin] Bundled ${path.relative(repoRoot, bundleOutFile)} (version ${version})`
  );
  console.error(
    `[bundle-plugin] Synced ${path.relative(repoRoot, pluginRulesPath)}`
  );
}

run().catch((error) => {
  console.error("[bundle-plugin] Build failed:", error);
  process.exit(1);
});
