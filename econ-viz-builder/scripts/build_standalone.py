#!/usr/bin/env python3
"""
Standalone builder for single-file teaching visualizations.

Takes an HTML file that references local JS modules via <script src="...">,
inlines those modules (in the order they appear in the HTML, which is taken
as dependency order), and writes a single distributable HTML file. CDN
scripts (http/https//) are left untouched.

Usage:
    python3 build_standalone.py app.html [-o app_standalone.html]

Generalized from the per-tool builder used across the econ teaching suite.
"""

import argparse
import re
import sys
from pathlib import Path


def extract_local_scripts(html: str):
    """Find local .js <script src> tags; return (html_without_them, ordered_paths)."""
    pattern = re.compile(r'<script\s+src=["\']([^"\']+\.js)["\'][^>]*>\s*</script>\s*')
    local = [m for m in pattern.findall(html)
             if not m.startswith(("http://", "https://", "//"))]
    cleaned = pattern.sub(
        lambda m: "" if m.group(1) in local else m.group(0), html)
    return cleaned, local


def embed_modules(html: str, modules: dict) -> str:
    """Inline module sources before the first remaining inline <script>."""
    block = "\n    <!-- Embedded JavaScript Modules -->\n"
    for name, content in modules.items():
        indented = content.replace("\n", "\n        ")
        block += (f"    <script>\n        // Embedded module: {name}\n"
                  f"        {indented}\n    </script>\n")
    block += "\n"
    # Insert before the first inline script (typically the MathJax config,
    # which must stay ahead of the MathJax loader).
    return re.sub(r"(\s*<script[^>]*>)", block + r"\1", html, count=1)


def build(source: Path, output: Path) -> bool:
    html = source.read_text(encoding="utf-8")
    cleaned, scripts = extract_local_scripts(html)
    if not scripts:
        print(f"No local script references found in {source}; nothing to embed.")
        return False
    print(f"Embedding {len(scripts)} module(s): {', '.join(scripts)}")

    modules = {}
    for rel in scripts:
        path = source.parent / rel
        if not path.exists():
            print(f"Error: referenced module not found: {path}")
            return False
        modules[rel] = path.read_text(encoding="utf-8")

    final = embed_modules(cleaned, modules)
    output.write_text(final, encoding="utf-8")

    js_lines = sum(len(c.splitlines()) for c in modules.values())
    print(f"Source HTML: {len(html.splitlines())} lines"
          f" + modules: {js_lines} lines"
          f" -> {output.name}: {len(final.splitlines())} lines")
    print(f"Wrote {output}")
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", type=Path, help="HTML file referencing local JS modules")
    ap.add_argument("-o", "--output", type=Path, default=None,
                    help="output file (default: <source>_standalone.html)")
    args = ap.parse_args()

    output = args.output or args.source.with_name(
        args.source.stem + "_standalone.html")
    if output.resolve() == args.source.resolve():
        print("Error: output would overwrite the source file.")
        sys.exit(1)
    sys.exit(0 if build(args.source, output) else 1)


if __name__ == "__main__":
    main()
