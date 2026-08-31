import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ResolveCustomerUseCase } from "./resolve-customer.usecase.js";
import { Customer } from "../domain/customer.entity.js";
import type { CreateCustomerInput, CustomerRepositoryPort } from "../domain/ports.js";

class FakeCustomerRepository implements CustomerRepositoryPort {
  public customers: Customer[] = [];
  public nameUpdates: Array<{ id: string; name: string }> = [];

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

  async updateName(tenantId: string, id: string, name: string): Promise<void> {
    this.nameUpdates.push({ id, name });
    const existing = this.customers.find((c) => c.tenantId === tenantId && c.id === id);
    if (existing) {
      this.customers = this.customers.map((c) =>
        c.id === id ? Customer.create({ id: c.id, tenantId: c.tenantId, email: c.email, name }) : c,
      );
    }
  }
}

describe("ResolveCustomerUseCase", () => {
  const tenantId = randomUUID();

  it("creates a new Customer when none exists for the email", async () => {
    const customers = new FakeCustomerRepository();
    const useCase = new ResolveCustomerUseCase(customers);

    const customer = await useCase.execute({ tenantId, email: "ana@example.com", name: "Ana" });

    expect(customers.customers).toHaveLength(1);
    expect(customer.email).toBe("ana@example.com");
    expect(customer.name).toBe("Ana");
  });

  it("reuses an existing Customer for a repeat buyer by email", async () => {
    const customers = new FakeCustomerRepository();
    const useCase = new ResolveCustomerUseCase(customers);

    const first = await useCase.execute({ tenantId, email: "ana@example.com", name: "Ana" });
    const second = await useCase.execute({ tenantId, email: "ana@example.com", name: "Ana" });

    expect(second.id).toBe(first.id);
    expect(customers.customers).toHaveLength(1);
  });

  it("updates the Customer's name when it changed on a repeat checkout", async () => {
    const customers = new FakeCustomerRepository();
    const useCase = new ResolveCustomerUseCase(customers);

    const first = await useCase.execute({ tenantId, email: "ana@example.com", name: "Ana" });
    await useCase.execute({ tenantId, email: "ana@example.com", name: "Ana Souza" });

    expect(customers.nameUpdates).toEqual([{ id: first.id, name: "Ana Souza" }]);
  });

  it("creates distinct Customers for the same email in different tenants", async () => {
    const customers = new FakeCustomerRepository();
    const useCase = new ResolveCustomerUseCase(customers);
    const otherTenantId = randomUUID();

    const first = await useCase.execute({ tenantId, email: "ana@example.com", name: "Ana" });
    const second = await useCase.execute({ tenantId: otherTenantId, email: "ana@example.com", name: "Ana" });

    expect(second.id).not.toBe(first.id);
    expect(customers.customers).toHaveLength(2);
  });
});
