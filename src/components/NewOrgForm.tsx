"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewOrgForm() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const res = await fetch("/api/orgs", {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "Failed to create organization");
    setName("");
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        placeholder="New organization name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Button type="submit" disabled={busy}>
        {busy ? "Creating..." : "Create"}
      </Button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
