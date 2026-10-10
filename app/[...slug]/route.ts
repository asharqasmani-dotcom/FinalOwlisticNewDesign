import { readMirrorHtml } from "@/lib/mirror";

export const dynamic = "force-static";

type Params = { params: Promise<{ slug: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
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
