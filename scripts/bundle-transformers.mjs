import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import esbuild from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const inputFile = path.join(
  rootDir,
  "node_modules",
  "@huggingface",
  "transformers",
  "dist",
  "transformers.web.js"
);
const outDir = path.join(rootDir, "vendor", "transformers");
const outFile = path.join(outDir, "transformers.bundle.mjs");

await mkdir(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [inputFile],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  outfile: outFile,
  sourcemap: false,
  logLevel: "info",
});

console.log("Bundled transformers to", outFile);
