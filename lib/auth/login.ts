import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "../db";
import { newId, newSecret, nowSeconds, sha256 } from "../ids";
import { sendMail } from "../mail";

const CODE_TTL = 10 * 60;
const MAX_ATTEMPTS = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Erzeugt einen 6-stelligen Code und verschickt ihn. */
export async function requestLoginCode(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const db = await getDb();
  // Höchstens 5 Codes pro E-Mail in 10 Minuten
  const recent = await db
    .select({ id: schema.loginCodes.id })
    .from(schema.loginCodes)
    .where(and(eq(schema.loginCodes.email, email), gt(schema.loginCodes.createdAt, nowSeconds() - CODE_TTL)))
    .all();
  if (recent.length >= 5) throw new Error("Zu viele Codes angefordert. Bitte warte ein paar Minuten.");

  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  const code = String(n).padStart(6, "0");
  await db.insert(schema.loginCodes).values({
    id: newId(),
    email,
    codeHash: await sha256(`${email}:${code}`),
    expiresAt: nowSeconds() + CODE_TTL,
  });
  await sendMail({
    to: email,
    subject: `${code} ist dein spielerminus-Code`,
    text: `Dein Anmeldecode: ${code}\n\nEr ist 10 Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail.`,
  });
}

/** Prüft den Code und gibt die User-ID zurück (legt den User bei Bedarf an). */
export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<string> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  const db = await getDb();
  const entry = await db
    .select()
    .from(schema.loginCodes)
    .where(and(eq(schema.loginCodes.email, email), isNull(schema.loginCodes.consumedAt)))
    .orderBy(desc(schema.loginCodes.createdAt))
    .get();
  if (!entry || entry.expiresAt < nowSeconds()) throw new Error("Der Code ist abgelaufen. Fordere bitte einen neuen an.");
  if (entry.attempts >= MAX_ATTEMPTS) throw new Error("Zu viele Versuche. Fordere bitte einen neuen Code an.");
  if (entry.codeHash !== (await sha256(`${email}:${code}`))) {
    await db
      .update(schema.loginCodes)
      .set({ attempts: entry.attempts + 1 })
      .where(eq(schema.loginCodes.id, entry.id));
    throw new Error("Der Code stimmt nicht.");
  }
  await db.update(schema.loginCodes).set({ consumedAt: nowSeconds() }).where(eq(schema.loginCodes.id, entry.id));

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (existing) return existing.id;
  const id = newId();
  await db.insert(schema.users).values({ id, email, icalToken: newSecret(24) });
  return id;
}

/** Telefonnummer grob nach E.164 normalisieren (deutsche Nummern ohne Vorwahl-Präfix bekommen +49). */
export function normalizePhone(raw: string): string | null {
  let s = raw.replace(/[\s\-/()]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  else if (s.startsWith("0")) s = `+49${s.slice(1)}`;
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}
