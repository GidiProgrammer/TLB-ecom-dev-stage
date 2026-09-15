import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";
import { updateProfileApproval } from "@/lib/admin-ops";
import type { AdminProfile } from "@/lib/queries/admin";
import {
  AdminCardToolbar,
  AdminEmpty,
  AdminIdentity,
  AdminPagination,
  AdminPanel,
  AdminSearch,
  AdminTable,
  useAdminPage,
} from "@/components/admin/AdminPageHeader";
import { StatusBadge, approvalTone } from "@/components/admin/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
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
  const paging = useAdminPage(filtered, q);

  if (profiles.length === 0) {
    return (
      <AdminPanel fill>
        <AdminEmpty>No accounts yet.</AdminEmpty>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel fill>
      <AdminCardToolbar>
        <AdminSearch value={q} onChange={setQ} label="Search accounts" />
      </AdminCardToolbar>
      {filtered.length === 0 ? (
        <AdminEmpty>No accounts match that search.</AdminEmpty>
      ) : (
        <AdminTable>
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
          {paging.slice.map((profile) => (
            <ProfileRow key={profile.id} profile={profile} canApprove={canApprove} />
          ))}
        </TableBody>
        </AdminTable>
      )}
      {filtered.length === 0 ? null : (
        <AdminPagination
          page={paging.page}
          pageCount={paging.pageCount}
          start={paging.start}
          end={paging.end}
          total={paging.total}
          onPage={paging.setPage}
        />
      )}
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
      <TableCell>
        <AdminIdentity hint={profile.institution_name ?? undefined}>{label}</AdminIdentity>
      </TableCell>
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
            <SelectTrigger className="h-11 min-h-11 w-36 text-xs" aria-label={`Approval for ${label}`}>
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
