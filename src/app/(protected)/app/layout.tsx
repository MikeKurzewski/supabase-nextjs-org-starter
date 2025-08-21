import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server layout guard for /app (protected route group)
 * Redirects to /signin if not authenticated.
 * See: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/server-side/nextjs.mdx
 */

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/signin");
  }

  return <>{children}</>;
}
