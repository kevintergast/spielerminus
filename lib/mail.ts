import { getEnv } from "./db";

export type Mail = { to: string; subject: string; text: string; html?: string };

function parseFrom(from: string): { email: string; name: string } {
  const m = from.match(/^(.*)<(.+)>$/);
  return m ? { name: m[1].trim(), email: m[2].trim() } : { email: from, name: "spielerminus" };
}

/**
 * Verschickt eine E-Mail über Cloudflare Email Sending.
 * In der Entwicklung und an `.test`-Adressen wird nur geloggt.
 */
export async function sendMail(mail: Mail, env?: CloudflareEnv): Promise<void> {
  const e = env ?? (await getEnv());
  const isDev = e.NEXTJS_ENV === "development";
  if (isDev || mail.to.endsWith(".test") || !e.EMAIL) {
    console.log(`[mail] an ${mail.to}: ${mail.subject}\n${mail.text}`);
    return;
  }
  await e.EMAIL.send({
    to: mail.to,
    from: parseFrom(e.MAIL_FROM),
    subject: mail.subject,
    text: mail.text,
    html: mail.html ?? `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(mail.text)}</pre>`,
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
