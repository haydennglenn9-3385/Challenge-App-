import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  console.log("SYNC ROUTE HIT");

  const body = await req.json();
  console.log("BODY RECEIVED:", body);

  const { wixId, email, name } = body;

  if (!wixId || !email) {
    console.log("MISSING FIELDS:", { wixId, email });
    return NextResponse.json({ error: "Missing wixId or email" }, { status: 400 });
  }

  // Check if user exists
  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("*")
    .eq("id", wixId)
    .single();

  console.log("EXISTING USER:", existingUser, "ERROR:", existingError);

  if (existingUser) {
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
      total_points: 0
    })
    .select()
    .single();

  console.log("INSERT RESULT:", data, "ERROR:", error);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
