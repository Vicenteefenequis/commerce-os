import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { COUNTER_SALE_PLACEHOLDER_CUSTOMER, ResolvePlaceholderCustomerUseCase } from "./resolve-placeholder-customer.usecase.js";
import { Customer } from "../domain/customer.entity.js";
import type { CreateCustomerInput, CustomerRepositoryPort } from "../domain/ports.js";

class FakeCustomerRepository implements CustomerRepositoryPort {
  public customers: Customer[] = [];
  async create(input: CreateCustomerInput): Promise<Customer> {
    const customer = Customer.create(input);
    this.customers.push(customer);
    return customer;
  }
  async findByEmail(tenantId: string, email: string): Promise<Customer | null> {
    return (
      this.customers.find((c) => c.tenantId === tenantId && c.email.toLowerCase() === email.toLowerCase()) ?? null
    );
  }
  async findById(tenantId: string, id: string): Promise<Customer | null> {
    return this.customers.find((c) => c.tenantId === tenantId && c.id === id) ?? null;
  }
  async updateName(): Promise<void> {}
}

describe("ResolvePlaceholderCustomerUseCase", () => {
  it("creates the placeholder customer on first use", async () => {
    const tenantId = randomUUID();
    const customers = new FakeCustomerRepository();
    const useCase = new ResolvePlaceholderCustomerUseCase(customers);

    const customer = await useCase.execute(tenantId);

    expect(customer.name).toBe(COUNTER_SALE_PLACEHOLDER_CUSTOMER.name);
    expect(customer.email.toLowerCase()).toBe(COUNTER_SALE_PLACEHOLDER_CUSTOMER.email.toLowerCase());
    expect(customers.customers).toHaveLength(1);
  });

  it("reuses the same placeholder customer across multiple counter sales for the same tenant", async () => {
    const tenantId = randomUUID();
    const customers = new FakeCustomerRepository();
    const useCase = new ResolvePlaceholderCustomerUseCase(customers);

    const first = await useCase.execute(tenantId);
    const second = await useCase.execute(tenantId);

    expect(second.id).toBe(first.id);
    expect(customers.customers).toHaveLength(1);
  });

  it("uses a separate placeholder customer per tenant", async () => {
    const customers = new FakeCustomerRepository();
    const useCase = new ResolvePlaceholderCustomerUseCase(customers);

    const first = await useCase.execute(randomUUID());
    const second = await useCase.execute(randomUUID());

    expect(second.id).not.toBe(first.id);
  });
});
