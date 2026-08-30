export type Role =
  | "owner"
  | "admin"
  | "finance"
  | "sales"
  | "operator"
  | "access_operator"
  | "read_only";

export interface Identity {
  userId: string;
  tenantId: string;
  roles: Role[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      identity?: Identity;
    }
  }
}
