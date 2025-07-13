import { build } from "bun";
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "fs";
import { resolve, extname, join, dirname } from "path";

const dist = resolve("./dist");

await build({
  entrypoints: [
    "./src/client/script.ts"
  ],
  outdir: dist,
  target: "browser",
  minify: true,
  splitting: true,
  sourcemap: "inline"
});

console.log("✅ Build Javascript.");


// Copy static files
cpSync("./src/client/css", dist, { recursive: true });
cpSync("./src/client/icon", dist, { recursive: true });

console.log("✅ Copied static assets.");

const INCLUDE_REGEX = /{{\s*([^{}]+)\s*}}/g;
const processIncludes = (html: string, basePath: string): string => {
  let oldHtml: string;
  let newHtml = html;
  let count = 0;

  do {
    if (++count > 1000) throw new Error("Infinite include loop");
    oldHtml = newHtml;
    newHtml = newHtml.replace(INCLUDE_REGEX, (_, includePath) => {
      const full = resolve(basePath, includePath.trim());
      return readFileSync(full, "utf8");
    });
  } while (oldHtml !== newHtml);

  return newHtml;
}

const html = readFileSync("./src/client/index.html", "utf8");
const included = processIncludes(html, process.cwd());
mkdirSync(dist, {
  recursive: true
});
writeFileSync(join(dist, "index.html"), included);

console.log("✅ Constructed index.html.");