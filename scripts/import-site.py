#!/usr/bin/env python3
"""Mirror legencymedia.com pages + assets for local Next.js preview."""

from __future__ import annotations

import concurrent.futures
import json
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MIRROR = ROOT / "mirror" / "dist"
PUBLIC = ROOT / "public"
ORIGIN = "https://legencymedia.com"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
ASSET_RE = re.compile(
    r"""["'(]((?:/_astro/|/fonts/|/img/|/video/|/scene/|/vendor/)[^"'<>\s),]+)"""
)
SKIP_PATHS = {"/", "/sitemap-0.xml"}


def fetch_bytes(url: str, retries: int = 4) -> bytes:
    last = None
    for attempt in range(retries):
        try:
            return urlopen(Request(url, headers=UA), timeout=180).read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            print(f"retry {attempt + 1}/{retries} {url} ({exc})", flush=True)
    raise RuntimeError(f"failed {url}: {last}")


def fetch_text(url: str) -> str:
    return fetch_bytes(url).decode("utf-8", "replace")


def normalize_page_path(path: str) -> str:
    if not path.startswith("/"):
        path = "/" + path
    if path != "/" and not path.endswith("/"):
        path += "/"
    return path


def page_disk_path(path: str) -> Path:
    path = normalize_page_path(path)
    if path == "/":
        return MIRROR / "index.html"
    return MIRROR / path.lstrip("/") / "index.html"


def discover_pages() -> list[str]:
    xml = fetch_text(ORIGIN + "/sitemap-0.xml")
    pages = []
    for loc in re.findall(r"<loc>(.*?)</loc>", xml):
        if not loc.startswith(ORIGIN):
            continue
        path = normalize_page_path(urlparse(loc).path or "/")
        if path in SKIP_PATHS or path.endswith(".xml"):
            continue
        pages.append(path)
    return sorted(set(pages))


def collect_asset_refs(text: str) -> set[str]:
    pending = set(ASSET_RE.findall(text))
    for srcset in re.findall(r'srcset="([^"]+)"', text):
        for item in srcset.split(","):
            url = item.strip().split()[0]
            if url.startswith(("/_astro/", "/fonts/", "/img/", "/video/", "/scene/")):
                pending.add(url)
    for dep in re.findall(r"""url\(["']?([^\s)'"<>]+)""", text):
        if dep.startswith(("data:", "http:", "https:", "#")):
            continue
        if dep.startswith(("/_astro/", "/fonts/", "/img/", "/video/", "/scene/", "/vendor/")):
            pending.add(urlparse(dep).path)
    return pending


def download_assets(seed_paths: set[str]) -> list[dict]:
    pending = set(seed_paths)
    pending.update(["/favicon.png", "/apple-touch-icon.png"])
    seen: set[str] = set()
    manifest: list[dict] = []

    def one(path: str):
        # Skip remote absolute junk / already local duplicates.
        if path.startswith(("http://", "https://", "data:")):
            return path, None, "skip"
        # Prefer existing public/mirror copy if present.
        rel = path.lstrip("/")
        existing = None
        for base in (PUBLIC, MIRROR):
            candidate = base / rel
            if candidate.exists() and candidate.stat().st_size > 0:
                existing = candidate.read_bytes()
                break
        if existing is not None:
            for base in (MIRROR, PUBLIC):
                dest = base / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                if not dest.exists():
                    dest.write_bytes(existing)
            return path, existing, "cached"

        url = urljoin(ORIGIN, path)
        try:
            data = fetch_bytes(url)
        except Exception as exc:  # noqa: BLE001
            print(f"WARN asset failed: {path} ({exc})", flush=True)
            return path, None, "fail"

        for base in (MIRROR, PUBLIC):
            dest = base / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        return path, data, "ok"

    while pending:
        batch = sorted(pending - seen)
        pending = set()
        if not batch:
            break
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            for path, data, status in pool.map(one, batch):
                seen.add(path)
                if data is None:
                    continue
                manifest.append({"path": path, "bytes": len(data), "status": status})
                if path.endswith((".css", ".js", ".json", ".svg")):
                    try:
                        text = data.decode("utf-8", "replace")
                    except Exception:
                        continue
                    pending |= collect_asset_refs(text)
                    for dep in re.findall(
                        r"""(?:from\s*|import\s*\(|import\s*)["'](\.[^"']+)["']""",
                        text,
                    ):
                        pending.add(urlparse(urljoin(ORIGIN + path, dep)).path)
        print(f"assets: {len(seen)} downloaded; queued {len(pending - seen)}", flush=True)
    return manifest


def prepare_html(html: str, page_path: str) -> str:
    # Remove inline analytics scripts; keep module src scripts.
    html = re.sub(r"<script(?![^>]*\bsrc=)[^>]*>.*?</script>", "", html, flags=re.S)
    html = re.sub(
        r'<script[^>]*src="(?:https://t\.rialtodata\.com/[^"]*|[^"]*(?:ConsentBanner\.astro_astro_type_script_index_0_lang|Base\.astro_astro_type_script_index_1_lang)[^"]*)"[^>]*></script>',
        "",
        html,
    )
    html = re.sub(r'<link[^>]*rel="(?:canonical|alternate)"[^>]*>', "", html)
    if 'name="robots"' not in html:
        html = html.replace(
            "</head>",
            '<meta name="robots" content="noindex,nofollow" />\n'
            '<link rel="stylesheet" href="/custom.css" />\n</head>',
        )
    if "/homepage.js" not in html:
        html = html.replace("</body>", '<script src="/homepage.js" defer></script>\n</body>')

    # Keep internal site links local.
    def local_link(match: re.Match[str]) -> str:
        prefix, href, suffix = match.group(1), match.group(2), match.group(3)
        if href.startswith(("http://", "https://", "mailto:", "tel:", "#", "//")):
            if href.startswith(ORIGIN):
                path = urlparse(href).path or "/"
                return f"{prefix}{normalize_page_path(path)}{suffix}"
            return match.group(0)
        if href.startswith("/"):
            path = urlparse(href).path
            if re.search(r"\.[a-z0-9]{2,5}$", path, re.I):
                return match.group(0)
            return f"{prefix}{normalize_page_path(path)}{suffix}"
        return match.group(0)

    html = re.sub(r'(<a\b[^>]*\bhref=")([^"]+)(")', local_link, html)
    return html


def localize_vendor_deps() -> None:
    vendor = MIRROR / "vendor"
    vendor.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "vendor").mkdir(parents=True, exist_ok=True)
    unicorn_url = (
        "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/"
        "dist/unicornStudio.umd.js"
    )
    unicorn = fetch_bytes(unicorn_url)
    for base in (MIRROR, PUBLIC):
        (base / "vendor" / "unicornStudio.umd.js").write_bytes(unicorn)

    for js in (MIRROR / "_astro").glob("Base.astro_astro_type_script_index_0_lang*.js"):
        text = js.read_text()
        if unicorn_url in text:
            text = text.replace(unicorn_url, "/vendor/unicornStudio.umd.js")
            js.write_text(text)
            pub = PUBLIC / "_astro" / js.name
            if pub.exists():
                pub.write_text(text)

    scene = MIRROR / "scene" / "band-loop.json"
    if scene.exists():
        data = scene.read_text()
        remote = sorted(set(re.findall(r"https[^\"\s]+", data)))
        for i, url in enumerate(remote):
            ext = ".mp4" if ".mp4" in url else ".png" if ".png" in url else ".jpg"
            name = f"scene-{i}{ext}"
            blob = fetch_bytes(url)
            for base in (MIRROR, PUBLIC):
                (base / "vendor" / name).write_bytes(blob)
            data = data.replace(url, f"/vendor/{name}")
        scene.write_text(data)
        pub_scene = PUBLIC / "scene" / "band-loop.json"
        pub_scene.parent.mkdir(parents=True, exist_ok=True)
        pub_scene.write_text(data)


def ensure_shared_files() -> None:
    # Cookie helper used by prepared pages.
    homepage_js = PUBLIC / "homepage.js"
    if not homepage_js.exists():
        homepage_js.write_text(
            """(() => {
  const banner = document.getElementById("consent-banner");
  if (!banner) return;
  const key = "homepage-cookie-choices";
  let choice = null;
  try { choice = JSON.parse(localStorage.getItem(key)); } catch {}
  const analytics = banner.querySelector("[data-consent-analytics]");
  const marketing = banner.querySelector("[data-consent-linkedin]");
  function show() {
    if (analytics) analytics.checked = !!choice?.analytics;
    if (marketing) marketing.checked = !!choice?.marketing;
    banner.hidden = false;
    document.documentElement.setAttribute("data-consent-open", "");
  }
  function save(a, m) {
    choice = { analytics: a, marketing: m };
    try { localStorage.setItem(key, JSON.stringify(choice)); } catch {}
    banner.hidden = true;
    document.documentElement.removeAttribute("data-consent-open");
  }
  banner.querySelector("[data-consent-accept]")?.addEventListener("click", () =>
    save(!!analytics?.checked, !!marketing?.checked)
  );
  banner.querySelector("[data-consent-reject]")?.addEventListener("click", () =>
    save(false, false)
  );
  document.querySelectorAll("[data-consent-reopen]").forEach((b) =>
    b.addEventListener("click", show)
  );
  if (!choice) show();
})();
"""
        )
    custom = PUBLIC / "custom.css"
    if not custom.exists():
        custom.write_text(
            "/* Add your styling changes here. This file loads after the reference styles. */\n"
        )
    # Copy shared helpers into mirror too.
    for name in ("homepage.js", "custom.css"):
        src = PUBLIC / name
        if src.exists():
            (MIRROR / name).write_bytes(src.read_bytes())


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--assets-only",
        action="store_true",
        help="Skip HTML fetch; harvest refs from already saved pages.",
    )
    args = parser.parse_args()

    MIRROR.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    pages = discover_pages()
    print(f"pages to import: {len(pages)}", flush=True)

    asset_seeds: set[str] = set()
    page_manifest = []
    for i, path in enumerate(pages, 1):
        dest = page_disk_path(path)
        if args.assets_only and dest.exists():
            html = dest.read_text()
            print(f"[{i}/{len(pages)}] reuse {path}", flush=True)
        else:
            url = ORIGIN + path
            print(f"[{i}/{len(pages)}] {path}", flush=True)
            html = prepare_html(fetch_text(url), path)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(html)
        asset_seeds |= collect_asset_refs(html)
        page_manifest.append({"path": path, "bytes": len(html.encode())})

    print("downloading assets...", flush=True)
    assets = download_assets(asset_seeds)
    print("localizing vendor deps...", flush=True)
    localize_vendor_deps()
    ensure_shared_files()

    out = {
        "origin": ORIGIN,
        "pages": page_manifest,
        "assets": len(assets),
    }
    (ROOT / "mirror" / "site-manifest.json").write_text(json.dumps(out, indent=2))
    print(
        f"done: {len(page_manifest)} pages, {len(assets)} assets -> {MIRROR}",
        flush=True,
    )


if __name__ == "__main__":
    main()
