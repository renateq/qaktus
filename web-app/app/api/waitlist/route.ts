import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/email";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email: unknown = body?.email;

  if (typeof email !== "string" || !isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: email.trim(), environment: process.env.NODE_ENV === "production" ? "prod" : "dev" });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ success: true }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
