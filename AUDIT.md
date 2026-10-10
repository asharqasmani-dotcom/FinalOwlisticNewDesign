# Functional and performance audit — 11 October 2026

The existing visual design, typography, colors, artwork, and section order are retained. Mobile layout repairs restore the intended single-column behavior.

## Coverage and evidence

- HTTP crawl: 60 pages and 108 linked local targets returned successful responses. See `scripts/audit/routes.json`.
- Browser checks: all 60 routes at 320px and 1440px; eight representative routes also at 768px. The AI visibility results table was the only document-level mobile overflow found. Its parent grid now stacks properly. Decorative clipped artwork was excluded from document-overflow failures.
- No missing CSS asset URLs or local JavaScript imports.
- Interactions: mobile service accordion, navigation opening/closing and Escape, FAQ switching, contact form validation, three-step progression, pointer and keyboard dropdown selection, and final delivery-error handling.
- Media: homepage video has no source download at initial view; loads near the services section, pauses after leaving it. Lower-page images render without broken-image errors after scrolling. WebGL artwork initializes near the viewport.
- Local API regression checks cover malformed bodies, invalid steps, origin checks, long answers, draft retrieval, opaque cookies, permission withdrawal, deletion, and no false completion when delivery is unconfigured.
- Production build and TypeScript checks pass.

## Measured loading

Production build, local machine, no network or CPU throttling. These are single browser samples, not Lighthouse scores or real-user Core Web Vitals. Mobile sample used the browser cache warmed by the desktop sample. The existing entrance animation remains in place, so first paint does not mean the entrance animation has finished.

| Metric | Desktop 1440px | Mobile 390px |
| --- | ---: | ---: |
| First contentful paint | 248 ms | 232 ms |
| LCP observed within first 4 seconds | 248 ms | 232 ms |
| Initial layout shift | 0 | 0 |
| Document load event | 229 ms | 199 ms |
| Initial resource transfer | 710,803 bytes | 13,500 bytes (warm cache) |

Warm HTML response medians over five requests: homepage 5.2 ms, contact 5.2 ms, social media service 4.3 ms, blog 4.9 ms. See `scripts/audit/performance.json`. Full hosted performance still depends on hosting, network, browser, and device. No pre-change browser timing baseline was recorded, so these numbers are not a claimed before/after speedup.

## Repairs

1. Generated smaller WebP copies of 29 large image assets: 34,555,344 → 20,154,934 bytes (14,400,410 bytes saved, roughly 42%). Originals remain intact. This is the total library reduction, not the saving per page. `scripts/optimize-images.mjs` regenerates the mapping.
2. Deferred decorative video downloads and WebGL initialization. Video playback pauses off-screen, in hidden tabs, and under reduced-motion preferences.
3. Added a timeout fallback for the page transition cover and a static homepage artwork fallback.
4. Preserved Ctrl/Cmd/Shift-click, download links, same-document anchors, and back-forward page restoration in the imported transition code.
5. Made collapsed service/FAQ panels inert and kept accordion height current after resize/font loading. Improved accessible heading spacing around line breaks.
6. Corrected the mobile page-brief CSS override that prevented stacking and caused the results table to overflow.
7. Repaired malformed metadata producing a visible stray `>` on contact, blog, and case-study pages.
8. Replaced broken Cloudflare email-protection links and removed the copied Cloudflare analytics beacon.
9. Added validation to mirrored route segments.
10. Replaced answer-filled cookies with private server-side draft files and an opaque HttpOnly cookie. Added server-side validation, safe errors, and no-store responses. Completion now requires delivery acknowledgement.
11. Stopped `/schedule` from loading the original agency's Calendly booking. It now redirects to contact until `CAL_BOOKING_URL` is configured with an HTTPS cal.com URL.
12. Added a separate optional build directory so production auditing does not overwrite the running development server's output.

## Pending configuration

The user plans to add Cal.com. No booking URL was supplied and no account integration was performed. Configure `CAL_BOOKING_URL` in `.env.local` when ready, then restart the server.

The contact form is not connected to email or a CRM. It saves drafts and displays an explicit delivery-unavailable message instead of claiming success. If this form is retained alongside Cal.com, configure `ENQUIRY_WEBHOOK_URL` and optional `ENQUIRY_WEBHOOK_TOKEN`. The endpoint must accept JSON `{id, answers}` and acknowledge with HTTP 2xx; it receives an `Idempotency-Key` header and should deduplicate retries. External delivery and booking completion remain unverified.

Local drafts are private files under `.data/enquiries`, excluded from Git. A deployed Node server needs `ENQUIRY_DATA_DIR` on persistent private storage; this file adapter is not suitable for ephemeral/read-only serverless storage. Drafts become unreadable after 14 days, but operational cleanup of expired files must be configured before production. API storage/delivery failures are surfaced to the user.

No visual redesign, live deployment, external test enquiry, or real booking was made. No real-device Safari/Firefox testing, throttled mobile profiling, or exhaustive accessibility certification was performed.

## Repeat checks

```sh
python3 scripts/audit/check-routes.py
python3 scripts/audit/check-enquiries.py
npx tsc --noEmit
NEXT_BUILD_DIR=.next-audit npm run build
NEXT_BUILD_DIR=.next-audit npm run start -- --hostname 127.0.0.1 --port 3003
```

API checks assume localhost:3002 with no delivery webhook configured. Browser profiling is opt-in only on localhost: open `/?audit=1` and inspect the `OWLISTIC_AUDIT` console entry after four seconds. It does not send measurements anywhere.
