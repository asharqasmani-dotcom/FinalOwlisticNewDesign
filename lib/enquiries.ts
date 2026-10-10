import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Draft = { answers: Record<string, unknown>; step: number; complete: boolean; measurementId?: string; updatedAt: string };
const directory = () => process.env.ENQUIRY_DATA_DIR || path.join(process.cwd(), ".data", "enquiries");
export const validId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
export async function readDraft(id: string): Promise<Draft | null> {
  if (!validId(id)) return null;
  try {
    const draft = JSON.parse(await readFile(path.join(directory(), `${id}.json`), "utf8"));
    if (Date.now() - Date.parse(draft.updatedAt) > 14 * 86400000) return null;
    return draft;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export async function saveDraft(id: string, draft: Draft) {
  if (!validId(id)) throw new Error("Invalid draft ID");
  await mkdir(directory(), {recursive: true, mode: 0o700});
  const destination = path.join(directory(), `${id}.json`);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(draft), {mode: 0o600});
  await rename(temporary, destination);
}
export async function deleteDraft(id: string) {
  if (validId(id)) await unlink(path.join(directory(), `${id}.json`)).catch(error => { if (error.code !== "ENOENT") throw error; });
}
export function validateAnswers(input: unknown, step: number): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const limits: Record<string, number> = {fullName:150,email:254,company:200,website:500,goals:3000,engagement:30,projectBudget:30,monthlyBudget:30,companySize:80,industry:80,timing:80};
  for (const [key, limit] of Object.entries(limits)) {
    const value = source[key] ?? "";
    if (typeof value !== "string" || value.length > limit) return null;
    result[key] = value.trim();
  }
  if (!result.fullName || !result.company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(result.email))) return null;
  if (result.website) {
    try {
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(String(result.website)) ? String(result.website) : `https://${result.website}`);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) return null;
    } catch { return null; }
  }
  const services = source.services ?? [];
  const allowedServices = ['social-media','customer-comm','lead-gen','seo-visibility','branding','website-support','complete','instagram','facebook','linkedin','twitter','guidance'];
  if (!Array.isArray(services) || services.length > 16 || services.some(value => !allowedServices.includes(value))) return null;
  result.services = [...new Set(services)];
  result.followUpConsent = source.followUpConsent === true;
  if (step >= 2 && (!services.length || !['project','monthly','both','unsure'].includes(String(result.engagement)))) return null;
  if (step === 3) {
    if (!['Generate More Leads','Improve Social Media Presence','Manage Customer Inquiries','Improve Online Visibility','Complete Digital Support'].includes(String(result.companySize))) return null;
    if (!['Software and AI','Financial services','Insurance','Professional services','E-commerce and retail','Healthcare','Property and relocation','Other'].includes(String(result.industry))) return null;
    if (!['Immediately','Within 2 Weeks','Within a Month','Just Exploring'].includes(String(result.timing))) return null;
    if (['monthly','both'].includes(String(result.engagement)) && !['300','guidance'].includes(String(result.monthlyBudget))) return null;
    if (['project','both'].includes(String(result.engagement)) && !['5-10','10-20','20-50','50-100','100-300','300+','guidance'].includes(String(result.projectBudget))) return null;
  }
  return result;
}
