"use client";

import { useState, type FormEvent } from "react";
import { ListPageLayout } from "@/components/layout/list-page-layout";
import { FormPageLayout } from "@/components/layout/form-page-layout";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createRoleAssignment, revokeRoleAssignment } from "./actions";
import type { UserWithAssignments, VenueOption } from "./page";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  gerente: "Gerente",
  vendedor: "Vendedor",
  validador: "Validador",
};

const ROLE_VARIANTS: Record<string, BadgeVariant> = {
  admin: "success",
  gerente: "neutral",
  vendedor: "neutral",
  validador: "neutral",
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

interface AssignmentRow {
  assignmentId: string;
  email: string;
  userId: string;
  role: string;
  venueName: string | null;
}

/**
 * spec: foundation/user-management - Admin-only screen to list an
 * Organization's users with their role assignments, and create/revoke a
 * Venue-scoped assignment. One row per assignment (a user with more than
 * one assignment appears more than once).
 */
export function UsersContent({ users, venues }: { users: UserWithAssignments[]; venues: VenueOption[] }) {
  const { showToast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string>("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const venueNameById = new Map(venues.map((v) => [v.id, v.name]));
  const userOptions = users.map((u) => ({ value: u.userId, label: u.email }));
  const venueOptions = venues.map((v) => ({ value: v.id, label: v.name }));

  const rows: AssignmentRow[] = users.flatMap((user) =>
    user.assignments.map((a) => ({
      assignmentId: a.id,
      email: user.email,
      userId: user.userId,
      role: a.role,
      venueName: a.venueId ? (venueNameById.get(a.venueId) ?? a.venueId) : null,
    })),
  );

  function resetCreateForm() {
    setRole("");
    setFieldErrors({});
  }

  async function onCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await createRoleAssignment(formData);

    setIsSubmitting(false);
    if (result.error) {
      setFieldErrors({ role: result.error });
      return;
    }

    setCreateDialogOpen(false);
    resetCreateForm();
    showToast({ title: "Atribuição criada", variant: "success" });
  }

  async function onRevoke(assignmentId: string) {
    setRevokingId(assignmentId);
    const result = await revokeRoleAssignment(assignmentId);
    setRevokingId(null);
    if (result.error) {
      showToast({ title: result.error, variant: "error" });
      return;
    }
    showToast({ title: "Atribuição revogada", variant: "success" });
  }

  return (
    <>
      <ListPageLayout
        title="Usuários"
        description="Usuários da organização e suas permissões de acesso ao painel administrativo."
        createLabel="Nova atribuição"
        onCreate={() => setCreateDialogOpen(true)}
        isEmpty={rows.length === 0}
        emptyStateDescription="Nenhuma atribuição de permissão encontrada."
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Usuário</TableHeaderCell>
              <TableHeaderCell>Permissão</TableHeaderCell>
              <TableHeaderCell>Unidade</TableHeaderCell>
              <TableHeaderCell>Ações</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.assignmentId}>
                <TableCell label="Usuário">{row.email}</TableCell>
                <TableCell label="Permissão">
                  <Badge variant={ROLE_VARIANTS[row.role] ?? "neutral"}>{ROLE_LABELS[row.role] ?? row.role}</Badge>
                </TableCell>
                <TableCell label="Unidade">{row.venueName ?? "Todas (organização inteira)"}</TableCell>
                <TableCell label="Ações">
                  <Button
                    variant="ghost"
                    isLoading={revokingId === row.assignmentId}
                    onClick={() => onRevoke(row.assignmentId)}
                  >
                    Revogar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListPageLayout>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetCreateForm();
        }}
        title="Nova atribuição"
        description="Atribui uma permissão a um usuário já existente na organização."
      >
        <FormPageLayout
          title=""
          onSubmit={onCreateSubmit}
          onCancel={() => setCreateDialogOpen(false)}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
        >
          <Select label="Usuário" name="userId" options={userOptions} placeholder="Selecione um usuário" />
          <Select
            label="Permissão"
            name="role"
            options={ROLE_OPTIONS}
            value={role}
            onValueChange={setRole}
            placeholder="Selecione uma permissão"
          />
          {role && role !== "admin" && (
            <Select label="Unidade" name="venueId" options={venueOptions} placeholder="Selecione uma unidade" />
          )}
        </FormPageLayout>
      </Dialog>
    </>
  );
}
