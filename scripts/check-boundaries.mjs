import { readdir, readFile } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = join(root, "src");
const sourceExtensions = new Set([".ts", ".tsx"]);
const violations = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(path) : [path];
    }),
  );

  return nested.flat().filter((path) => sourceExtensions.has(extname(path)));
}

function describeSourcePath(path) {
  const parts = relative(sourceRoot, path).split(sep);
  const layer = parts[0] === "main.tsx" ? "app" : parts[0];
  return {
    layer,
    feature: layer === "features" ? parts[1] : undefined,
  };
}

function describeImport(importer, specifier) {
  const alias = specifier.match(/^@(app|features|platform|shared)(?:\/(.*))?$/);
  if (alias) {
    const layer = alias[1];
    const remainder = alias[2]?.split("/") ?? [];
    return {
      layer,
      feature: layer === "features" ? remainder[0] : undefined,
      isFeaturePublicApi: layer === "features" && remainder.length === 1,
    };
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const target = normalize(resolve(importer, "..", specifier));
  const description = describeSourcePath(target);
  return { ...description, isFeaturePublicApi: false };
}

function checkImport(importer, specifier) {
  const from = describeSourcePath(importer);
  const target = describeImport(importer, specifier);

  if (!target) return;

  const location = relative(root, importer);
  const report = (message) => violations.push(`${location}: ${message} (${specifier})`);

  if (from.layer === "shared" && target.layer !== "shared") {
    report("shared code cannot depend on an outer layer");
  }

  if (
    from.layer === "platform" &&
    target.layer !== "platform" &&
    target.layer !== "shared"
  ) {
    report("platform code may depend only on platform or shared code");
  }

  if (from.layer === "features") {
    const isOwnFeature =
      target.layer === "features" && target.feature === from.feature;
    if (target.layer !== "shared" && !isOwnFeature) {
      report("a feature may depend only on itself or shared code");
    }
  }

  if (
    target.layer === "features" &&
    from.layer !== "features" &&
    !target.isFeaturePublicApi
  ) {
    report("code outside a feature must import its public index");
  }

  if (from.layer !== "app" && target.layer === "app") {
    report("only app code may import app code");
  }
}

async function checkFeatureIndexes() {
  const featuresRoot = join(sourceRoot, "features");
  const entries = await readdir(featuresRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const files = await readdir(join(featuresRoot, entry.name));
    if (!files.includes("index.ts")) {
      violations.push(`src/features/${entry.name}: feature needs a public index.ts`);
    }
  }
}

const files = await collectFiles(sourceRoot);
const staticImportPattern = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
const dynamicImportPattern = /import\(\s*["']([^"']+)["']\s*\)/g;

for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const pattern of [staticImportPattern, dynamicImportPattern]) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      if (match[1]) checkImport(file, match[1]);
    }
  }
}

await checkFeatureIndexes();

if (violations.length > 0) {
  console.error("Architecture boundary violations:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Architecture boundaries passed for ${files.length} source files.`);
}
