import { readFileSync } from "node:fs";
import path from "node:path";

const navPath = path.join(process.cwd(), "content/home/nav.html");
const footerPath = path.join(process.cwd(), "content/home/footer.html");

function readCanonicalNav(): string {
  return readFileSync(navPath, "utf8").trimEnd();
}

function readCanonicalFooter(): string {
  return readFileSync(footerPath, "utf8").trimEnd();
}

/** Nav markup for inner (mirrored) pages — same menu as home, with off-page hash links fixed. */
export function loadInnerPageNav(): string {
  return readCanonicalNav()
    .replace(/href="#contact"/g, 'href="/get-in-touch"')
    .replace(/href="#services"/g, 'href="/#services"')
    .replace(
      /<a(?![^>]*data-transition-prevent)([^>]*href="\/get-in-touch"[^>]*)>/g,
      '<a data-transition-prevent$1>',
    );
}

const TS_NAV_RE = /<nav\s+class="tsnav"[\s\S]*?<\/nav>/;

export function injectCanonicalNav(html: string): string {
  if (!TS_NAV_RE.test(html)) return html;
  return html.replace(TS_NAV_RE, loadInnerPageNav());
}

const TS_FOOTER_RE = /<footer\s+class="site-footer"[\s\S]*?<\/footer>/;

export function injectCanonicalFooter(html: string): string {
  if (!TS_FOOTER_RE.test(html)) return html;
  return html.replace(TS_FOOTER_RE, readCanonicalFooter());
}
