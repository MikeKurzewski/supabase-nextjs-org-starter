import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function JoinPage({
  params,
}: {
  // Next 15: params can be async
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;           // ✅ await params
  const supabase = await createClient();

  // If not signed in, send through /signin and preserve where to come back
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) redirect(`/signin?next=/join/${token}`);

  // Accept the invite
  const { error } = await supabase.rpc("accept_org_invite", { p_token: token });
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 rounded-lg shadow">
          <h1 className="text-xl font-semibold mb-2">Invite error</h1>
          <p className="text-red-600">{error.message}</p>
        </div>
      </main>
    );
  }

  // Success → go to app
  redirect("/app");
}
