import { jwtDecode } from "jwt-decode";
import { createClient } from "@supabase/supabase-js";

export async function getUserFromToken(token: string) {
  const supabase = import { supabase } from "@/lib/supabase/client";    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const decoded: any = jwtDecode(token);
  const wixId = decoded.wixId;

  // 1. Try to find the user
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("wix_id", wixId)
    .single();

  if (existingUser) return existingUser;

  // 2. Create the user if not found
  const { data: newUser } = await supabase
    .from("users")
    .insert({ wix_id: wixId })
    .select()
    .single();

  return newUser;
}
