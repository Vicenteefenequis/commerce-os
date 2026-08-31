import { randomUUID } from "node:crypto";
import type { Customer } from "../domain/customer.entity.js";
import type { CustomerRepositoryPort } from "../domain/ports.js";

export interface ResolveCustomerInput {
  tenantId: string;
  email: string;
  name: string;
}

/**
 * spec: customer/customer - "Customer identity is captured without an
 * account", "Customer is reused by email within a tenant". Reuses an
 * existing Customer for a repeat buyer (updating their name if it
 * changed), otherwise creates one - same upsert-by-natural-key shape as
 * checkout resolving a variant, just for the buyer instead of the product.
 */
export class ResolveCustomerUseCase {
  constructor(private readonly customers: CustomerRepositoryPort) {}

  async execute(input: ResolveCustomerInput): Promise<Customer> {
    const existing = await this.customers.findByEmail(input.tenantId, input.email);
    if (existing) {
      if (existing.name !== input.name) {
        await this.customers.updateName(input.tenantId, existing.id, input.name);
      }
      return existing;
    }

    return this.customers.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      email: input.email,
      name: input.name,
    });
  }
}
