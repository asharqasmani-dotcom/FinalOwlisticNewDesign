import { readMirrorHtml } from "@/lib/mirror";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  if (slug.join("/") === "schedule") {
    const configured = process.env.CAL_BOOKING_URL;
    if (configured) {
      try {
        const booking = new URL(configured);
        if (booking.protocol === "https:" && booking.hostname === "cal.com") {
          return Response.redirect(booking, 307);
        }
      } catch { /* Keep the contact fallback for invalid configuration. */ }
    }
    return Response.redirect(new URL("/get-in-touch", _request.url), 307);
  }
  const html = readMirrorHtml(slug);

  if (!html) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
