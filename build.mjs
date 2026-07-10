import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync, watch } from "fs";
import { open, stat, unlink } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "dist");
const src = join(__dirname, "src");
const watchMode = process.argv.includes("--watch");
const buildLockPath = join(__dirname, ".build.lock");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function acquireBuildLock() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const handle = await open(buildLockPath, "wx");
      await handle.writeFile(String(process.pid));
      return async () => {
        await handle.close();
        await unlink(buildLockPath).catch(error => {
          if (error.code !== "ENOENT") throw error;
        });
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const lockStat = await stat(buildLockPath).catch(() => null);
      if (lockStat && Date.now() - lockStat.mtimeMs > 30000) {
        await unlink(buildLockPath).catch(() => {});
        continue;
      }
      await sleep(50);
    }
  }
  throw new Error("等待构建锁超时");
}

function formatBuildVersion(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `b${y}${m}${d}.${h}${min}`;
}

function formatBuildTimestamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

async function buildUnlocked() {
  const buildVersion = formatBuildVersion();
  const buildTimestamp = formatBuildTimestamp();
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, "js"), { recursive: true });
  mkdirSync(join(dist, "css"), { recursive: true });

  await esbuild.build({
    entryPoints: [join(src, "js", "app.js")],
    bundle: true,
    minify: true,
    outdir: join(dist, "js"),
    format: "esm",
    target: "es2020",
    splitting: true,
    chunkNames: "chunks/[name]-[hash]",
    entryNames: "[name]",
    sourcemap: false,
    define: {
      __BUILD_VERSION__: JSON.stringify(buildVersion),
      __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    },
  });

  const cssFiles = [
    "design-tokens.css",
    "base.css",
    "components.css",
    "responsive.css",
  ];

  const cssContent = cssFiles
    .map(f => readFileSync(join(src, "css", f), "utf-8"))
    .join("\n");

  await esbuild.build({
    stdin: {
      contents: cssContent,
      sourcefile: "bundle.css",
      loader: "css",
    },
    minify: true,
    outfile: join(dist, "css", "style.min.css"),
  });

  let html = readFileSync(join(__dirname, "index.html"), "utf-8");

  html = html.replace(
    /<link rel="stylesheet" href="src\/css\/[^"]*\.css" \/>\s*/g,
    ""
  );
  html = html.replace(
    "</head>",
    '  <link rel="stylesheet" href="css/style.min.css" />\n</head>'
  );

  html = html.replace(
    '<script type="module" src="src/js/app.js"></script>',
    '<script type="module" src="js/app.js"></script>'
  );

  writeFileSync(join(dist, "index.html"), html);

  console.log(`[build] ${new Date().toLocaleTimeString()}  dist/ 完成  ${buildVersion}`);
}

async function build() {
  const releaseBuildLock = await acquireBuildLock();
  try {
    await buildUnlocked();
  } finally {
    await releaseBuildLock();
  }
}

await build();

if (watchMode) {
  console.log("[watch] 监听 src/ 和 index.html...");
  watch(join(src, "css"), { recursive: true }, (_, f) => {
    console.log(`[watch] CSS: ${f}`);
    build().catch(e => console.error("[watch] build error:", e));
  });
  watch(join(src, "js"), { recursive: true }, (_, f) => {
    console.log(`[watch] JS: ${f}`);
    build().catch(e => console.error("[watch] build error:", e));
  });
  watch(__dirname, (_, f) => {
    if (f === "index.html") {
      console.log("[watch] index.html");
      build().catch(e => console.error("[watch] build error:", e));
    }
  });
}
