import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { wixId, email, name } = body;

  if (!wixId || !email) {
    return NextResponse.json({ error: "Missing wixId or email" }, { status: 400 });
  }

  // Check if user exists by wix_id
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("wix_id", wixId)
    .single();

  if (existingUser) {
    return NextResponse.json(existingUser);
  }

  // Create new user
  const { data, error } = await supabase
    .from("users")
    .insert({
      wix_id: wixId,   // ⭐ correct column
      email,
      name,
      streak: 0,
      total_points: 0
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
