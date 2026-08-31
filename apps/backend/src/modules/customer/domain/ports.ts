import type { Customer } from "./customer.entity.js";

export interface CreateCustomerInput {
  id: string;
  tenantId: string;
  email: string;
  name: string;
}

export interface CustomerRepositoryPort {
  create(input: CreateCustomerInput): Promise<Customer>;
  /** Case-insensitive lookup, scoped to the tenant (spec: customer/customer - "Customer is reused by email within a tenant"). */
  findByEmail(tenantId: string, email: string): Promise<Customer | null>;
  findById(tenantId: string, id: string): Promise<Customer | null>;
  updateName(tenantId: string, id: string, name: string): Promise<void>;
}
