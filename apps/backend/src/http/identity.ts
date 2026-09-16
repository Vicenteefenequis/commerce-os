import type { Role } from "../modules/authorization/domain/role.js";
import type { VenueScope } from "../modules/authorization/domain/venue-scope.js";

export type { Role };
export type { VenueScope };

export interface Identity {
  userId: string;
  tenantId: string;
  roles: Role[];
  venueIds: VenueScope;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      identity?: Identity;
      /** Raw request body bytes, captured by express.json()'s verify hook so a webhook route can check a provider signature computed over the exact bytes sent (PAY-003/PAY-004). */
      rawBody?: Buffer;
    }
  }
}
