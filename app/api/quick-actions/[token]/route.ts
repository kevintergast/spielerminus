import { getDb } from "@/lib/db";
import { QUICK_ACTIONS, type QuickAction, redeemActionToken } from "@/lib/services/quick-actions";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (!QUICK_ACTIONS.includes(action as QuickAction)) return Response.json({ error: "invalid_action" }, { status: 400 });
  try {
    await redeemActionToken(await getDb(), token, action as QuickAction, "push");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 409 });
  }
}
