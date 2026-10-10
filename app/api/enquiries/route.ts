import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type EnquiryAnswers = Record<string, unknown>;

type EnquiryDraft = {
  answers: EnquiryAnswers;
  step: number;
  complete: boolean;
  measurementId?: string;
  updatedAt: string;
};

const COOKIE = "owlistic-enquiry-draft";
const MAX_AGE = 60 * 60 * 24 * 14;

function readDraft(request: Request): EnquiryDraft | null {
  const raw = request.headers.get("cookie") || "";
  const match = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1)));
  } catch {
    return null;
  }
}

function draftCookie(draft: EnquiryDraft | null): string {
  if (!draft) {
    return `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
  return `${COOKIE}=${encodeURIComponent(JSON.stringify(draft))}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`;
}

function json(data: unknown, init?: ResponseInit, draft?: EnquiryDraft | null) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (draft !== undefined) headers.append("set-cookie", draftCookie(draft));
  return NextResponse.json(data, { ...init, headers });
}

export async function GET(request: Request) {
  const draft = readDraft(request);
  if (!draft) {
    return json({ saved: false, complete: false });
  }
  return json({
    saved: true,
    complete: !!draft.complete,
    answers: draft.answers,
    step: draft.step,
    measurementId: draft.measurementId,
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.action === "withdraw-permission") {
    const draft = readDraft(request);
    if (draft?.answers) {
      draft.answers.followUpConsent = false;
      draft.updatedAt = new Date().toISOString();
      return json({ ok: true }, undefined, draft);
    }
    return json({ ok: true });
  }

  const step = Number(body.step) || 1;
  const answers = (body.answers || {}) as EnquiryAnswers;
  const complete = step >= 3;
  const draft: EnquiryDraft = {
    answers,
    step,
    complete,
    measurementId: complete ? randomUUID() : undefined,
    updatedAt: new Date().toISOString(),
  };

  return json(
    {
      saved: true,
      complete,
      measurementId: draft.measurementId,
      step,
    },
    undefined,
    draft,
  );
}

export async function DELETE() {
  return json({ ok: true, saved: false, complete: false }, undefined, null);
}
