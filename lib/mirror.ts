import { prepareMarkup } from "./prepare-markup";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { injectCanonicalNav } from "@/lib/load-nav";

const mirrorRoot = path.join(process.cwd(), "mirror", "dist");

export function resolveMirrorHtml(slug: string[]): string | null {
  const clean = slug.filter(Boolean);
  if (clean.some((part) => part === "." || part === ".." || /[\\/\0]/.test(part))) return null;
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

const BUBBLE_ARROW_CSS =
  '<link rel="stylesheet" href="/_astro/btn-bubble-arrow.css">';

function stripConsentBanner(html: string): string {
  let out = html
    // ConsentBanner CSS also held btn-bubble-arrow styles; keep those via a dedicated sheet.
    .replace(/<link[^>]*ConsentBanner[^>]*>/gi, BUBBLE_ARROW_CSS)
    .replace(/<script[^>]*ConsentBanner[^>]*><\/script>\s*/gi, "")
    .replace(
      /<!--\s*Withdrawing consent[\s\S]*?-->\s*<button\b[^>]*data-consent-reopen[^>]*>[\s\S]*?<\/button>/gi,
      "",
    )
    .replace(/<button\b[^>]*data-consent-reopen[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/<aside\b[^>]*id="consent-banner"[^>]*>[\s\S]*?<\/aside>/gi, "");

  // Most mirrored pages never linked ConsentBanner CSS, so always ensure button styles load.
  if (!out.includes("/_astro/btn-bubble-arrow.css")) {
    if (out.includes("</head>")) {
      out = out.replace("</head>", `${BUBBLE_ARROW_CSS}\n</head>`);
    } else {
      out = `${BUBBLE_ARROW_CSS}\n${out}`;
    }
  }
  return out;
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

const SITE_ORIGIN = "https://www.owlisticstudio.com";

const ORGANIZATION_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Owlistic Studio",
  url: SITE_ORIGIN,
  email: "Ashar@owlisticstudio.com",
  sameAs: ["https://www.linkedin.com/in/muhammad-ashar/"],
});

/** Rewrite leftover agency identity + set Owlistic canonicals/schema. */
function fixSeoIdentity(html: string, slug: string[]): string {
  const path =
    slug.length === 0 ? "/" : `/${slug.join("/").replace(/\/+$/, "")}/`;
  const canonical = `${SITE_ORIGIN}${path}`;

  let out = html
    .replace(/https?:\/\/(?:www\.)?legencymedia\.com/gi, SITE_ORIGIN)
    .replace(/https?:\/\/(?:www\.)?owalisticsol\.com/gi, SITE_ORIGIN)
    .replace(
      /https?:\/\/(?:www\.)?linkedin\.com\/company\/legencymedia\/?/gi,
      "https://www.linkedin.com/in/muhammad-ashar/",
    )
    .replace(/legencymedia\.com/gi, "owlisticstudio.com")
    .replace(/Legency Media/g, "Owlistic Studio")
    .replace(/Ibad Haider/gi, "Owlistic Studio")
    .replace(
      /content="noindex\s*,\s*nofollow"/gi,
      'content="index,follow"',
    )
    .replace(
      /content="nofollow\s*,\s*noindex"/gi,
      'content="index,follow"',
    );

  // Drop wrong person schema left from prior brands.
  out = out.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?(?:Ibad Haider|owalisticsol)[\s\S]*?<\/script>/gi,
    "",
  );

  if (/rel=["']canonical["']/i.test(out)) {
    out = out.replace(
      /<link\b[^>]*rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${canonical}">`,
    );
  } else if (out.includes("</head>")) {
    out = out.replace(
      "</head>",
      `<link rel="canonical" href="${canonical}">\n</head>`,
    );
  }

  if (/property=["']og:url["']/i.test(out)) {
    out = out.replace(
      /<meta\b[^>]*property=["']og:url["'][^>]*>/i,
      `<meta property="og:url" content="${canonical}">`,
    );
  }

  if (
    !out.includes('"@type":"Organization"') &&
    !out.includes('"@type": "Organization"')
  ) {
    out = out.replace(
      "</head>",
      `<script type="application/ld+json">${ORGANIZATION_JSON_LD}</script>\n</head>`,
    );
  }

  return out;
}

export function readMirrorHtml(slug: string[]): string | null {
  const file = resolveMirrorHtml(slug);
  if (!file) return null;
  const html = prepareMarkup(readFileSync(file, "utf8")).replace("</head>", '<link rel="stylesheet" href="/runtime.css"><script src="/runtime.js" defer></script></head>');
  return ensureFaqScript(
    fixSeoIdentity(
      injectCanonicalNav(fixFooterAndDeadLinks(stripConsentBanner(html))),
      slug,
    ),
  );
}
