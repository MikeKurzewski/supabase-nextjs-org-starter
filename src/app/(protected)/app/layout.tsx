import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server layout guard for /app (protected route group)
 * Redirects to /signin if not authenticated.
 */
export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // createClient is async now (Next 15 dynamic API change)
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/signin");
  }

  return <>{children}</>;
}
