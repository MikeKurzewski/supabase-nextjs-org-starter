"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Org = { id: string; name: string };

export default function InviteMemberForm({
  orgs,
  adminOrgIds,
}: {
  orgs: Org[];
  adminOrgIds: string[];
}) {
  const adminOrgs = orgs.filter((o) => adminOrgIds.includes(o.id));

  // If somehow rendered with no admin orgs, show nothing (parent also guards)
  if (adminOrgs.length === 0) return null;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [orgId, setOrgId] = useState(adminOrgs[0]?.id ?? "");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInviteUrl(null);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: orgId || adminOrgs[0]?.id, email, role }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) return setErr(json.error || "Failed to create invite");

    setInviteUrl(json.joinUrl);
    setEmail("");
  }

  return (
    <div className="space-y-2">
      {adminOrgs.length > 1 && (
        <select
          className="border rounded px-2 py-1"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
        >
          {adminOrgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      )}

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <Input
          type="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select
          className="border rounded px-2 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "member")}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="submit" disabled={busy}>
          {busy ? "Inviting..." : "Invite"}
        </Button>
      </form>

      {inviteUrl && (
        <div className="text-sm">
          Invite link created:{" "}
          <a className="underline" href={inviteUrl}>{inviteUrl}</a>
          <span className="ml-2 text-zinc-500">(share with the invitee)</span>
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
