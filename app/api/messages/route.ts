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

const MSG_SELECT = "id, text, created_at, edited_at, author_id, users!messages_author_id_fkey(id, name)";

// GET /api/messages?challengeId=x | teamId=x | dmUserId=x
export async function GET(req: Request) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId");
  const teamId      = searchParams.get("teamId");
  const dmUserId    = searchParams.get("dmUserId");

  let query = supabaseAdmin
    .from("messages")
    .select(MSG_SELECT)
    .order("created_at", { ascending: true })
    .limit(100);

  if (challengeId) {
    // Verify user is a member of this challenge
    const { data: membership } = await supabaseAdmin
      .from("challenge_members")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    query = query.eq("challenge_id", challengeId).eq("is_dm", false);
  } else if (teamId) {
    // Verify user is assigned to this team
    const { data: membership } = await supabaseAdmin
      .from("challenge_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    query = query.eq("team_id", teamId).eq("is_dm", false);
  } else if (dmUserId) {
    query = query
      .eq("is_dm", true)
      .or(
        `and(author_id.eq.${user.id},recipient_id.eq.${dmUserId}),and(author_id.eq.${dmUserId},recipient_id.eq.${user.id})`
      );
  } else {
    return NextResponse.json({ error: "Missing context param" }, { status: 400 });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/messages
export async function POST(req: Request) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { text, challengeId, teamId, dmUserId } = body;

  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const insert: Record<string, any> = {
    text:      text.trim(),
    author_id: user.id,
    is_dm:     false,
  };

  if (challengeId)  insert.challenge_id  = challengeId;
  else if (teamId)  insert.team_id       = teamId;
  else if (dmUserId) {
    insert.is_dm        = true;
    insert.recipient_id = dmUserId;
  } else {
    return NextResponse.json({ error: "Missing context param" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert(insert)
    .select(MSG_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/messages — edit own message
export async function PATCH(req: Request) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, text } = await req.json();
  if (!id || !text?.trim())
    return NextResponse.json({ error: "id and text required" }, { status: 400 });

  const { data: msg } = await supabaseAdmin
    .from("messages").select("author_id").eq("id", id).single();
  if (!msg || msg.author_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("messages")
    .update({ text: text.trim(), edited_at: new Date().toISOString() })
    .eq("id", id)
    .select(MSG_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/messages?id=x
export async function DELETE(req: Request) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: msg } = await supabaseAdmin
    .from("messages").select("author_id").eq("id", id).single();
  if (!msg || msg.author_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabaseAdmin.from("messages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}