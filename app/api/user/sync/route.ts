import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = import { supabase } from "@/lib/supabase/client";  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side only
);

export async function POST(req: Request) {
  const body = await req.json();
  const { wixId, email, name } = body;

  if (!wixId || !email) {
    return NextResponse.json(
      { error: "Missing wixId or email" },
      { status: 400 }
    );
  }

  // Check if user exists
  const { data: existingUser, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("wix_id", wixId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json(
      { error: findError.message },
      { status: 500 }
    );
  }

  // If user exists → update name/email
  if (existingUser) {
    const { data, error } = await supabase
      .from("users")
      .update({
        name,
        email,
      })
      .eq("wix_id", wixId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  }

  // If user does NOT exist → create new row
  const { data, error } = await supabase
    .from("users")
    .insert({
      wix_id: wixId,
      email,
      name,
      streak: 0,
      total_points: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
