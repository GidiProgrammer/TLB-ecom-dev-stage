import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";
import { updateProfileApproval } from "@/lib/admin-ops";
import type { AdminProfile } from "@/lib/queries/admin";
import { AdminEmpty, AdminPanel, AdminSearch } from "@/components/admin/AdminPageHeader";
import { StatusBadge, approvalTone } from "@/components/admin/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const APPROVAL_STATUSES = Constants.public.Enums.approval_status;

function mutationMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function profileLabel(profile: AdminProfile) {
  return profile.full_name?.trim() || profile.institution_name?.trim() || "Unnamed account";
}

export function AccountWorkspace({
  profiles,
  canApprove,
}: {
  profiles: AdminProfile[];
  canApprove: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((p) =>
      [profileLabel(p), p.account_type, p.institution_name ?? "", p.approval_status, p.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [profiles, q]);

  if (profiles.length === 0) {
    return (
      <AdminPanel>
        <AdminEmpty>No accounts yet.</AdminEmpty>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel>
      <div className="border-b border-border px-4 py-3">
        <AdminSearch value={q} onChange={setQ} label="Search accounts" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead className="hidden md:table-cell">Institution</TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
            <TableHead>Approval</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((profile) => (
            <ProfileRow key={profile.id} profile={profile} canApprove={canApprove} />
          ))}
        </TableBody>
      </Table>
    </AdminPanel>
  );
}

function ProfileRow({ profile, canApprove }: { profile: AdminProfile; canApprove: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const label = profileLabel(profile);

  const saveStatus = async (approvalStatus: (typeof APPROVAL_STATUSES)[number]) => {
    if (approvalStatus === profile.approval_status) return;
    setBusy(true);
    try {
      await updateProfileApproval({ data: { profileId: profile.id, approvalStatus } });
      await queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success(`Account ${label} updated`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update approval status"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="hidden capitalize sm:table-cell">{profile.account_type}</TableCell>
      <TableCell className="hidden md:table-cell">{profile.institution_name ?? "—"}</TableCell>
      <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
        {new Date(profile.created_at).toLocaleString("en-GB")}
      </TableCell>
      <TableCell>
        {canApprove ? (
          <Select
            value={profile.approval_status}
            onValueChange={(value) => void saveStatus(value as (typeof APPROVAL_STATUSES)[number])}
            disabled={busy}
          >
            <SelectTrigger className="h-9 min-h-9 w-36 text-xs" aria-label={`Approval for ${label}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPROVAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge tone={approvalTone(profile.approval_status)}>{profile.approval_status}</StatusBadge>
        )}
      </TableCell>
    </TableRow>
  );
}
