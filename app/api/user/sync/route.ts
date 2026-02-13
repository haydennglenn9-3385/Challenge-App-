import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  console.log("🔥 /api/user/sync HIT");

  let body;
  try {
    body = await req.json();
    console.log("📦 BODY RECEIVED:", body);
  } catch (err) {
    console.error("❌ Failed to parse JSON body:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { wixId, email, name } = body;

  console.log("🧩 Extracted fields:", { wixId, email, name });

  if (!wixId || !email) {
    console.error("❌ Missing required fields:", { wixId, email });
    return NextResponse.json({ error: "Missing wixId or email" }, { status: 400 });
  }

  // Check if user exists
  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("*")
    .eq("id", wixId)
    .single();

  console.log("🔍 EXISTING USER CHECK:", { existingUser, existingError });

  if (existingUser) {
    console.log("✅ User already exists — returning existing user");
    return NextResponse.json(existingUser);
  }

  // Create new user
  const { data, error } = await supabase
    .from("users")
    .insert({
      id: wixId,
      email,
      name,
      streak: 0,
      total_points: 0,
    })
    .select()
    .single();

  console.log("📝 INSERT RESULT:", { data, error });

  if (error) {
    console.error("❌ Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("🎉 USER CREATED:", data);
  return NextResponse.json(data);
}
