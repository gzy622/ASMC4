import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, watch } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "dist");
const src = join(__dirname, "src");
const watchMode = process.argv.includes("--watch");

async function build() {
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

  html = html.replace(/<link rel="modulepreload"[^>]*\/>\n?/g, "");

  html = html.replace(/<script src="src\/js\/bootstrap\.js"><\/script>\s*/g, "");

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

  console.log(`[build] ${new Date().toLocaleTimeString()}  dist/ ok`);
}

await build();

if (watchMode) {
  console.log("[watch] watching src/ and index.html...");
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
