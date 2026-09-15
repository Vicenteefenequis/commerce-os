import { ResolveCustomerUseCase } from "./resolve-customer.usecase.js";
import type { Customer } from "../domain/customer.entity.js";
import type { CustomerRepositoryPort } from "../domain/ports.js";

/**
 * Well-known identity for a walk-in counter sale with no buyer info (spec:
 * admin/counter-sale - "Counter sale buyer identity is optional"). The
 * email is a fixed literal rather than one derived per tenant because
 * Customer lookup is already tenant-scoped (unique index on (tenant_id,
 * lower(email)) - see migrations/1700000017000_customers.cjs), so reusing
 * the same literal across tenants is safe and simpler.
 */
export const COUNTER_SALE_PLACEHOLDER_CUSTOMER = {
  email: "cliente-balcao@ingressa.internal",
  name: "Cliente balcão",
};

/**
 * Resolves (or lazily creates) the single shared placeholder Customer an
 * Organization's counter sales without buyer info are attributed to
 * (design.md - Decisions #3). Built on ResolveCustomerUseCase's existing
 * upsert-by-email behavior, so calling this twice for the same
 * Organization returns the same Customer rather than creating a second
 * placeholder.
 */
export class ResolvePlaceholderCustomerUseCase {
  constructor(private readonly customers: CustomerRepositoryPort) {}

  async execute(tenantId: string): Promise<Customer> {
    return new ResolveCustomerUseCase(this.customers).execute({
      tenantId,
      email: COUNTER_SALE_PLACEHOLDER_CUSTOMER.email,
      name: COUNTER_SALE_PLACEHOLDER_CUSTOMER.name,
    });
  }
}
