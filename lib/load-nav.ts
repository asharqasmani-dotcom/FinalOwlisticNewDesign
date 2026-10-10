import { readFileSync } from "node:fs";
import path from "node:path";

const navPath = path.join(process.cwd(), "content/home/nav.html");

function readCanonicalNav(): string {
  return readFileSync(navPath, "utf8").trimEnd();
}

/** Nav markup for inner (mirrored) pages — same menu as home, with off-page hash links fixed. */
export function loadInnerPageNav(): string {
  return readCanonicalNav()
    .replace(/href="#contact"/g, 'href="/get-in-touch/"')
    .replace(/href="#services"/g, 'href="/#services"');
}

const TS_NAV_RE = /<nav\s+class="tsnav"[\s\S]*?<\/nav>/;

export function injectCanonicalNav(html: string): string {
  if (!TS_NAV_RE.test(html)) return html;
  return html.replace(TS_NAV_RE, loadInnerPageNav());
}
