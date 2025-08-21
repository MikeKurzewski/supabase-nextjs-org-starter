import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

/**
 * Protected /app page
 * Shows "Hello world — your CRM is ready", user email, and Sign out button.
 * User is fetched server-side for type safety and security.
 */

export default async function AppPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">Hello world — your CRM is ready</h1>
        <p className="mb-4 text-zinc-700 dark:text-zinc-200">
          {data?.user?.email ? (
            <>Signed in as <span className="font-mono">{data.user.email}</span></>
          ) : (
            <>No user found.</>
          )}
        </p>
        <SignOutButton />
      </div>
    </main>
  );
}
