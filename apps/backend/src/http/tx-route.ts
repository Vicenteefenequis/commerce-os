import type { NextFunction, Request, Response } from "express";
import { sql, type Transaction } from "kysely";
import { db } from "../db/kysely.js";
import type { Database } from "../db/schema.js";

export type Trx = Transaction<Database>;

export interface TxResult {
  status: number;
  body?: unknown;
  /** Header name -> value(s), applied to the response before it is sent. */
  headers?: Record<string, string | string[]>;
}

type TxHandler = (req: Request, trx: Trx) => Promise<TxResult>;

function sendTxResult(res: Response, result: TxResult): void {
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) {
      res.setHeader(name, value);
    }
  }
  if (result.status === 204) {
    res.status(204).end();
    return;
  }
  if (Buffer.isBuffer(result.body)) {
    res.status(result.status).send(result.body);
    return;
  }
  res.status(result.status).json(result.body ?? {});
}

/**
 * Wraps a route handler in a single database transaction scoped to the
 * caller's tenant. `app.tenant_id` is set via `set_config(..., true)`
 * (transaction-local) before the handler runs, so Row Level Security
 * policies enforce isolation even if a repository forgets its own filter.
 * The HTTP response is only sent after the transaction commits.
 */
export function txRoute(handler: TxHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.transaction().execute(async (trx) => {
        const tenantId = req.identity?.tenantId;
        if (tenantId) {
          await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
        }
        return handler(req, trx);
      });
      sendTxResult(res, result);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * For routes with no tenant context at all (e.g. creating a new
 * Organization - the tenant does not exist yet). No app.tenant_id is set;
 * only tables without RLS (i.e. `organizations` itself) may be touched here.
 */
export function txRoutePublic(handler: TxHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.transaction().execute((trx) => handler(req, trx));
      sendTxResult(res, result);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Same as txRoute, but for routes that establish the tenant themselves
 * (e.g. login, which is unauthenticated and receives tenantId in its
 * request body rather than from req.identity).
 */
export function txRouteWithTenant(resolveTenantId: (req: Request) => string, handler: TxHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.transaction().execute(async (trx) => {
        const tenantId = resolveTenantId(req);
        await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
        return handler(req, trx);
      });
      sendTxResult(res, result);
    } catch (err) {
      next(err);
    }
  };
}
