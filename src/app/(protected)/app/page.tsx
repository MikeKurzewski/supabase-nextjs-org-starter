import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import NewOrgForm from "@/components/NewOrgForm";
import InviteMemberForm from "@/components/InviteMemberForm";

export default async function AppPage() {
  const supabase = await createClient();

  const [{ data: userRes }, { data: orgs }, { data: memberships }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("organizations").select("id,name").order("created_at", { ascending: false }),
    // RLS lets users read their own memberships; we'll filter to admins below
    supabase.from("organization_members").select("org_id, role"),
  ]);

  const email = userRes?.user?.email ?? null;

  const adminOrgIds = (memberships ?? [])
    .filter((m) => m.role === "admin")
    .map((m) => m.org_id);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">Hello world — your CRM is ready</h1>
        <p className="mb-4 text-zinc-700 dark:text-zinc-200">
          {email ? <>Signed in as <span className="font-mono">{email}</span></> : <>No user found.</>}
        </p>
        <SignOutButton />

        <hr className="my-6 border-zinc-200 dark:border-zinc-800" />
        <h2 className="text-lg font-semibold mb-3">Organizations</h2>

        <div className="mb-4">
          <NewOrgForm />
        </div>

        <ul className="list-disc pl-5 space-y-1">
          {(orgs ?? []).map((o) => <li key={o.id}>{o.name}</li>)}
          {(!orgs || orgs.length === 0) && (
            <li className="list-none text-zinc-500">No organizations yet.</li>
          )}
        </ul>

        {/* Admin-only invite section */}
        <div className="mt-6">
          <h3 className="text-md font-medium mb-2">Invite a member</h3>
          {adminOrgIds.length > 0 ? (
            <InviteMemberForm
              orgs={(orgs ?? []) as { id: string; name: string }[]}
              adminOrgIds={adminOrgIds as string[]}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              You need admin rights in an organization to invite members.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
