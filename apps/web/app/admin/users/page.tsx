import { AdminNav } from "@/components/layout/admin-nav";
import { ToastProvider } from "@/components/ui/toast";
import { backendFetch } from "@/lib/backend-fetch";
import { UsersContent } from "./users-content";

export interface RoleAssignment {
  id: string;
  role: string;
  venueId: string | null;
}

export interface UserWithAssignments {
  userId: string;
  email: string;
  assignments: RoleAssignment[];
}

export interface VenueOption {
  id: string;
  name: string;
}

/** spec: foundation/user-management - Admin-only user/role-assignment management. */
export default async function UsersPage() {
  const [usersResponse, venuesResponse] = await Promise.all([
    backendFetch("/users"),
    backendFetch("/venues"),
  ]);

  const usersBody = usersResponse.ok ? await usersResponse.json() : { users: [] };
  const venuesBody = venuesResponse.ok ? await venuesResponse.json() : { venues: [] };

  const users: UserWithAssignments[] = usersBody.users ?? [];
  const venues: VenueOption[] = (venuesBody.venues ?? []).map((v: { id: string; name: string }) => ({
    id: v.id,
    name: v.name,
  }));

  return (
    <ToastProvider>
      <AdminNav />
      <main className="mx-auto max-w-4xl p-8">
        <UsersContent users={users} venues={venues} />
      </main>
    </ToastProvider>
  );
}
