import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { injectCanonicalNav } from "@/lib/load-nav";

const mirrorRoot = path.join(process.cwd(), "mirror", "dist");

export function resolveMirrorHtml(slug: string[]): string | null {
  const clean = slug.filter(Boolean);
  if (clean.length === 0) return null;

  const candidates = [
    path.join(mirrorRoot, ...clean, "index.html"),
    path.join(mirrorRoot, `${clean.join("/")}.html`),
  ];

  for (const file of candidates) {
    if (existsSync(file)) return file;
  }
  return null;
}

export function readMirrorHtml(slug: string[]): string | null {
  const file = resolveMirrorHtml(slug);
  if (!file) return null;
  const html = readFileSync(file, "utf8");
  return injectCanonicalNav(html);
}
