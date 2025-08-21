"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * /signin page with shadcn Tabs (Sign in / Sign up).
 * Now preserves ?next=/join/<token> and redirects there after auth.
 */

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Remember ?next=... so we can send the user back after login / email callback
  useEffect(() => {
    const next = search.get("next");
    if (next) localStorage.setItem("next-dest", next);
  }, [search]);

  // If user already authenticated (e.g., returned via magic link), bounce to next/app
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dest = localStorage.getItem("next-dest") || "/app";
        localStorage.removeItem("next-dest");
        router.replace(dest);
      }
    })();
  }, [router]);

  async function onSignIn(data: FormValues) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Sign in failed");
    } else {
      toast.success("Signed in!");
      const dest = localStorage.getItem("next-dest") || "/app";
      localStorage.removeItem("next-dest");
      router.replace(dest);
    }
  }

  async function onSignUp(data: FormValues) {
    setLoading(true);
    const supabase = createClient();

    // Build email redirect so confirmation returns to /signin and then to ?next (if any)
    const desiredDest = localStorage.getItem("next-dest") || "/app";
    const emailRedirectTo = `${window.location.origin}/signin?next=${encodeURIComponent(
      desiredDest
    )}`;

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { emailRedirectTo },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Sign up failed");
    } else {
      toast.success("Check your email to confirm your account.");
      setTab("signin");
      reset();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in / Sign up</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(v: string) => setTab(v as "signin" | "signup")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSubmit(onSignIn)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" {...register("email")} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSubmit(onSignUp)} className="space-y-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" autoComplete="email" {...register("email")} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" autoComplete="new-password" {...register("password")} />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing up..." : "Sign up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
