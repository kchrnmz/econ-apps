#!/usr/bin/env node
// Standalone builder for single-file teaching visualizations.
//
// Takes an HTML file that references local JS modules via <script src="...">,
// inlines those modules (in the order they appear in the HTML, which is taken
// as dependency order), and writes a single distributable HTML file. CDN
// scripts (http/https//) are left untouched.
//
// Usage:
//     node build_standalone.mjs app.html [-o app_standalone.html]
//
// Node port of build_standalone.py — identical behavior, no dependencies
// beyond the node runtime the skill's verification spine already requires.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join, basename, extname } from "node:path";
import process from "node:process";

const SCRIPT_TAG = /<script\s+src=["']([^"']+\.js)["'][^>]*>\s*<\/script>\s*/g;

function extractLocalScripts(html) {
  const local = [];
  for (const m of html.matchAll(SCRIPT_TAG)) {
    const src = m[1];
    if (!/^(https?:)?\/\//.test(src)) local.push(src);
  }
  const cleaned = html.replace(SCRIPT_TAG, (tag, src) =>
    local.includes(src) ? "" : tag);
  return { cleaned, local };
}

function embedModules(html, modules) {
  let block = "\n    <!-- Embedded JavaScript Modules -->\n";
  for (const [name, content] of modules) {
    const indented = content.replace(/\n/g, "\n        ");
    block += `    <script>\n        // Embedded module: ${name}\n` +
             `        ${indented}\n    </script>\n`;
  }
  block += "\n";
  // Insert before the first remaining inline script (typically the MathJax
  // config, which must stay ahead of the MathJax loader).
  return html.replace(/(\s*<script[^>]*>)/, (m) => block + m);
}

function build(source, output) {
  const html = readFileSync(source, "utf-8");
  const { cleaned, local } = extractLocalScripts(html);
  if (local.length === 0) {
    console.log(`No local script references found in ${source}; nothing to embed.`);
    return false;
  }
  console.log(`Embedding ${local.length} module(s): ${local.join(", ")}`);

  const modules = [];
  for (const rel of local) {
    const path = join(dirname(source), rel);
    if (!existsSync(path)) {
      console.error(`Error: referenced module not found: ${path}`);
      return false;
    }
    modules.push([rel, readFileSync(path, "utf-8")]);
  }

  const final = embedModules(cleaned, modules);
  writeFileSync(output, final, "utf-8");

  const lines = (s) => s.split("\n").length;
  const jsLines = modules.reduce((n, [, c]) => n + lines(c), 0);
  console.log(`Source HTML: ${lines(html)} lines` +
              ` + modules: ${jsLines} lines` +
              ` -> ${basename(output)}: ${lines(final)} lines`);
  console.log(`Wrote ${output}`);
  return true;
}

function main() {
  const args = process.argv.slice(2);
  let source = null, output = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") output = args[++i];
    else if (!source) source = args[i];
    else { console.error(`Unexpected argument: ${args[i]}`); process.exit(2); }
  }
  if (!source) {
    console.error("Usage: node build_standalone.mjs app.html [-o app_standalone.html]");
    process.exit(2);
  }
  if (!output) {
    const stem = basename(source, extname(source));
    output = join(dirname(source), `${stem}_standalone.html`);
  }
  if (resolve(output) === resolve(source)) {
    console.error("Error: output would overwrite the source file.");
    process.exit(1);
  }
  process.exit(build(source, output) ? 0 : 1);
}

main();
