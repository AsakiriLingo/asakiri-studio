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
    coreModule: layer === "core" ? parts[1] : undefined,
  };
}

function describeImport(importer, specifier) {
  const alias = specifier.match(/^@(app|core|features|platform|shared)(?:\/(.*))?$/);
  if (alias) {
    const layer = alias[1];
    const remainder = alias[2]?.split("/") ?? [];
    return {
      layer,
      feature: layer === "features" ? remainder[0] : undefined,
      coreModule: layer === "core" ? remainder[0] : undefined,
      isFeaturePublicApi: layer === "features" && remainder.length === 1,
      isCorePublicApi: layer === "core" && remainder.length === 1,
    };
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const target = normalize(resolve(importer, "..", specifier));
  const description = describeSourcePath(target);
  return {
    ...description,
    isFeaturePublicApi: false,
    isCorePublicApi: false,
  };
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

  if (from.layer === "core") {
    const isOwnCoreModule = target.layer === "core" && target.coreModule === from.coreModule;
    const isOtherCorePublicApi = target.layer === "core" && target.isCorePublicApi;
    if (target.layer !== "shared" && !isOwnCoreModule && !isOtherCorePublicApi) {
      report("core code may depend only on shared, itself, or another core public API");
    }
  }

  if (
    from.layer === "platform" &&
    target.layer !== "platform" &&
    target.layer !== "shared" &&
    !(target.layer === "core" && target.isCorePublicApi)
  ) {
    report("platform code may depend only on platform, shared, or core public APIs");
  }

  if (from.layer === "features") {
    const isOwnFeature = target.layer === "features" && target.feature === from.feature;
    const isCorePublicApi = target.layer === "core" && target.isCorePublicApi;
    if (target.layer !== "shared" && !isOwnFeature && !isCorePublicApi) {
      report("a feature may depend only on itself, shared, or core public APIs");
    }
  }

  if (target.layer === "features" && from.layer !== "features" && !target.isFeaturePublicApi) {
    report("code outside a feature must import its public index");
  }

  if (target.layer === "core" && from.layer !== "core" && !target.isCorePublicApi) {
    report("code outside a core module must import its public index");
  }

  if (from.layer !== "app" && target.layer === "app") {
    report("only app code may import app code");
  }
}

async function checkPublicIndexes(layer) {
  const layerRoot = join(sourceRoot, layer);
  const entries = await readdir(layerRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const files = await readdir(join(layerRoot, entry.name));
    if (!files.includes("index.ts")) {
      violations.push(`src/${layer}/${entry.name}: module needs a public index.ts`);
    }
  }
}

const files = await collectFiles(sourceRoot);
const staticImportPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
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

await checkPublicIndexes("core");
await checkPublicIndexes("features");

if (violations.length > 0) {
  console.error("Architecture boundary violations:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Architecture boundaries passed for ${files.length} source files.`);
}
