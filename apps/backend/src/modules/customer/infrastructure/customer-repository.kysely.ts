import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import { Customer } from "../domain/customer.entity.js";
import type { CreateCustomerInput, CustomerRepositoryPort } from "../domain/ports.js";

export class KyselyCustomerRepository implements CustomerRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(input: CreateCustomerInput): Promise<Customer> {
    const row = await this.trx
      .insertInto("customers")
      .values({ id: input.id, tenant_id: input.tenantId, email: input.email, name: input.name })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.toDomain(row);
  }

  async findByEmail(tenantId: string, email: string): Promise<Customer | null> {
    const row = await this.trx
      .selectFrom("customers")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where(sql`lower(email)`, "=", email.toLowerCase())
      .executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  async findById(tenantId: string, id: string): Promise<Customer | null> {
    const row = await this.trx
      .selectFrom("customers")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  async updateName(tenantId: string, id: string, name: string): Promise<void> {
    await this.trx
      .updateTable("customers")
      .set({ name, updated_at: sql`now()` })
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .execute();
  }

  private toDomain(row: { id: string; tenant_id: string; email: string; name: string }): Customer {
    return Customer.create({ id: row.id, tenantId: row.tenant_id, email: row.email, name: row.name });
  }
}
