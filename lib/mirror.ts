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

function stripConsentBanner(html: string): string {
  return html
    // ConsentBanner CSS also held btn-bubble-arrow styles; keep those via a dedicated sheet.
    .replace(
      /<link[^>]*ConsentBanner[^>]*>/gi,
      '<link rel="stylesheet" href="/_astro/btn-bubble-arrow.css">',
    )
    .replace(/<script[^>]*ConsentBanner[^>]*><\/script>\s*/gi, "")
    .replace(
      /<!--\s*Withdrawing consent[\s\S]*?-->\s*<button\b[^>]*data-consent-reopen[^>]*>[\s\S]*?<\/button>/gi,
      "",
    )
    .replace(/<button\b[^>]*data-consent-reopen[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/<aside\b[^>]*id="consent-banner"[^>]*>[\s\S]*?<\/aside>/gi, "");
}

const FOOTER_LINK_MAP: Record<string, string> = {
  "Social Media Management": "/services/social-media-management/",
  "Social Media": "/services/social-media-management/",
  "Content Creation": "/services/content-creation-design/",
  "Branded Graphics": "/services/content-creation-design/",
  "Community Engagement": "/services/community-management/",
  "Customer Message Support": "/services/customer-message-support/",
  "Customer Support": "/services/customer-message-support/",
  "Daily Posting": "/services/social-media-management/",
  "Daily Content Posting": "/services/social-media-management/",
  "Lead Generation": "/services/lead-generation/",
  "SEO Services": "/services/seo-online-visibility/",
  "SEO Support": "/services/seo-online-visibility/",
  "Local Citations": "/services/local-seo-citations/",
  "Website Audits": "/services/seo-online-visibility/",
  "Online Visibility": "/services/seo-online-visibility/",
  "Customer Inquiries": "/services/customer-inquiry-handling/",
  "Weekly Reporting": "/services/weekly-progress-reporting/",
  "Business Reporting": "/services/weekly-progress-reporting/",
  "Website Updates": "/services/website-creative-support/",
  "Website Support": "/services/website-creative-support/",
  "Creative Support": "/services/website-creative-support/",
  "Branding & Design": "/services/content-creation-design/",
  "Branding &amp; Design": "/services/content-creation-design/",
  Instagram: "/services/social-media-management/",
  Facebook: "/services/social-media-management/",
  LinkedIn: "/services/social-media-management/",
  "X (Twitter)": "/services/social-media-management/",
  "About Us": "/about",
  About: "/about",
  "How It Works": "/how-we-work",
  "How We Work": "/how-we-work",
  "Case Studies": "/case-studies",
  Blog: "/blog",
  Pricing: "/get-in-touch",
  "Contact Us": "/get-in-touch",
  "Get Started": "/get-in-touch",
  "Get In Touch": "/get-in-touch",
  "Privacy policy": "/privacy/",
  "Cookie policy": "/cookies/",
};

function fixFooterAndDeadLinks(html: string): string {
  return html.replace(
    /<a\b([^>]*?)href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, pre, href, post, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      const mapped = FOOTER_LINK_MAP[text];
      if (!mapped) return full;
      const dead =
        href === "#" ||
        href === "#services" ||
        href === "/#services" ||
        href === "#contact" ||
        href.endsWith("/#services");
      // Only rewrite clearly broken or generic service anchors for known labels.
      if (!dead && href.startsWith("/services/")) return full;
      if (!dead && href.startsWith("/get-in-touch")) return full;
      if (!dead && ["/about", "/how-we-work", "/case-studies", "/blog", "/privacy/", "/cookies/"].includes(href))
        return full;
      if (!dead && text === "Get Started" && href.startsWith("#")) {
        // Homepage closer/nav hashes are handled separately.
      }
      if (dead || href === "#contact" || href === "#services") {
        return `<a${pre}href="${mapped}"${post}>${inner}</a>`;
      }
      return full;
    },
  );
}

function ensureFaqScript(html: string): string {
  if (html.includes('src="/faq.js"')) return html;
  if (html.includes("</body>")) {
    return html.replace("</body>", '<script src="/faq.js" defer></script>\n</body>');
  }
  return `${html}\n<script src="/faq.js" defer></script>`;
}

export function readMirrorHtml(slug: string[]): string | null {
  const file = resolveMirrorHtml(slug);
  if (!file) return null;
  const html = readFileSync(file, "utf8");
  return ensureFaqScript(
    injectCanonicalNav(fixFooterAndDeadLinks(stripConsentBanner(html))),
  );
}
