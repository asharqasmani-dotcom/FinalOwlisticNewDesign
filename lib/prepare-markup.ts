import optimizedImages from "./optimized-images.json";

/** Shared, design-neutral repairs for imported HTML and homepage fragments. */
export function prepareMarkup(html: string): string {
  let out = html
    .replace(/(<meta\b[^>]*>)>/gi, "$1")
    .replace(/<script\b[^>]*src="[^"]*(?:cloudflareinsights\.com|email-decode\.min\.js)[^"]*"[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<a\b[^>]*href="\/cdn-cgi\/l\/email-protection\/[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
      '<a href="mailto:Ashar@owlisticstudio.com">Ashar@owlisticstudio.com</a>')
    .replace(/<video\b([^>]*)>([\s\S]*?)<\/video>/gi, (full, attrs: string, content: string) => {
      if (!/\bautoplay\b/i.test(attrs)) return full;
      attrs = attrs.replace(/\sautoplay\b/i, " data-lazy-video").replace(/\spreload="[^"]*"/i, "");
      attrs = attrs.replace(/\ssrc=/gi, " data-src=");
      return `<video${attrs} preload="none">${content.replace(/\ssrc=/gi, " data-src=")}</video>`;
    });
  for (const [source, target] of Object.entries(optimizedImages)) out = out.split(source).join(target);
  return out;
}
