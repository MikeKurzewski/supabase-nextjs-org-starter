import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { orgId, email, role } = await req.json();
  if (!orgId || !email) {
    return NextResponse.json({ error: "orgId and email required" }, { status: 400 });
  }

  const supabase = await createClient();

  // quick guard: ensure caller is admin of this org
  const { data: me, error: meErr } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .single();
  if (meErr || !me || me.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: token, error } = await supabase.rpc("create_org_invite", {
    p_org_id: orgId,
    p_email: email,
    p_role: role ?? "member",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || h.get("origin") || "http://localhost:3000";
  const joinUrl = `${origin}/join/${token}`;
  return NextResponse.json({ token, joinUrl });
}
