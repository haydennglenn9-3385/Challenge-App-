import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthedUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

// GET /api/reactions?messageId=x
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) return NextResponse.json({ error: "Missing messageId" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("reactions")
    .select("id, emoji, user_id, users(name)")
    .eq("message_id", messageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/reactions — toggles: adds if not present, removes if already reacted
export async function POST(req: Request) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji)
    return NextResponse.json({ error: "messageId and emoji required" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from("reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  } else {
    await supabaseAdmin.from("reactions").insert({
      message_id: messageId,
      user_id:    user.id,
      emoji,
    });
    return NextResponse.json({ action: "added" });
  }
}