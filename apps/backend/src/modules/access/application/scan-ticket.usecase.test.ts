import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ScanTicketUseCase, UnknownScanVenueError } from "./scan-ticket.usecase.js";
import { Order, OrderLine } from "../../commerce/domain/order.entity.js";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { Entitlement, type EntitlementStatus } from "../../ticketing/domain/entitlement.entity.js";
import { Ticket } from "../../ticketing/domain/ticket.entity.js";
import type { EntitlementRepositoryPort, TicketRepositoryPort } from "../../ticketing/domain/ports.js";
import { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type {
  RecordScanAttemptInput,
  ReservationPeriodLookupPort,
  ScanAttemptRepositoryPort,
} from "../domain/ports.js";
import { ScanAttempt } from "../domain/scan-attempt.entity.js";

class FakeVenueRepository implements Pick<VenueRepositoryPort, "findById"> {
  constructor(private readonly venues: Venue[]) {}
  async findById(tenantId: string, id: string): Promise<Venue | null> {
    return this.venues.find((v) => v.tenantId === tenantId && v.id === id) ?? null;
  }
}

class FakeTicketRepository implements Pick<TicketRepositoryPort, "findByCode"> {
  public lookups = 0;
  constructor(private readonly ticket: Ticket | null) {}
  async findByCode(tenantId: string, code: string): Promise<Ticket | null> {
    this.lookups += 1;
    return this.ticket && this.ticket.tenantId === tenantId && this.ticket.code === code ? this.ticket : null;
  }
}

class FakeEntitlementRepository implements Pick<EntitlementRepositoryPort, "findById" | "consume"> {
  public consumeCalls = 0;
  /** Simulates losing the guarded UPDATE to a concurrent scan (design.md D5). */
  public loseRace = false;
  constructor(private entitlement: Entitlement | null) {}
  async findById(tenantId: string, id: string): Promise<Entitlement | null> {
    return this.entitlement && this.entitlement.tenantId === tenantId && this.entitlement.id === id
      ? this.entitlement
      : null;
  }
  async consume(_tenantId: string, _id: string): Promise<boolean> {
    this.consumeCalls += 1;
    if (this.loseRace || !this.entitlement || this.entitlement.isConsumed) return false;
    this.entitlement = this.entitlement.consume();
    return true;
  }
  get status(): EntitlementStatus | null {
    return this.entitlement?.status ?? null;
  }
}

class FakeOrderRepository implements Pick<OrderRepositoryPort, "findById"> {
  constructor(private readonly order: Order | null) {}
  async findById(tenantId: string, id: string): Promise<Order | null> {
    return this.order && this.order.tenantId === tenantId && this.order.id === id ? this.order : null;
  }
}

class FakeReservationPeriodLookup implements ReservationPeriodLookupPort {
  constructor(private readonly periodsByReservationId: Record<string, string> = {}) {}
  async findPeriodByReservationId(_tenantId: string, reservationId: string): Promise<string | null> {
    return this.periodsByReservationId[reservationId] ?? null;
  }
}

class FakeScanAttemptRepository implements ScanAttemptRepositoryPort {
  public recorded: ScanAttempt[] = [];
  async record(input: RecordScanAttemptInput): Promise<ScanAttempt> {
    const attempt = ScanAttempt.create(input);
    this.recorded.push(attempt);
    return attempt;
  }
}

interface ScenarioOptions {
  status?: EntitlementStatus;
  /** Period of the Reservation backing the Order line, or undefined for a line with no Reservation. */
  reservationPeriod?: string;
}

function buildScenario(options: ScenarioOptions = {}) {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const orderId = randomUUID();
  const orderLineId = randomUUID();
  const entitlementId = randomUUID();
  const reservationId = options.reservationPeriod ? randomUUID() : null;
  const code = `TCK-${randomUUID()}`;

  const venue = Venue.create({ id: venueId, tenantId, name: "Unidade Norte", slug: "unidade-norte" });
  // A second Venue in the same Organization, so a scan can be made at a
  // legitimate Venue that is simply not the one the Ticket was sold for.
  const otherVenue = Venue.create({ id: randomUUID(), tenantId, name: "Unidade Sul", slug: "unidade-sul" });
  const order = Order.create({
    id: orderId,
    tenantId,
    venueId,
    customerId: randomUUID(),
    status: "paid",
    lines: [
      OrderLine.create({
        id: orderLineId,
        orderId,
        tenantId,
        variantId: randomUUID(),
        name: "Ingresso",
        unitPriceCents: 2000,
        quantity: 1,
        reservationId,
      }),
    ],
  });
  const entitlement = Entitlement.create({
    id: entitlementId,
    tenantId,
    orderId,
    orderLineId,
    customerId: order.customerId,
    status: options.status ?? "issued",
  });
  const ticket = Ticket.create({ id: randomUUID(), tenantId, entitlementId, code });

  const venues = new FakeVenueRepository([venue, otherVenue]);
  const tickets = new FakeTicketRepository(ticket);
  const entitlements = new FakeEntitlementRepository(entitlement);
  const orders = new FakeOrderRepository(order);
  const reservationPeriods = new FakeReservationPeriodLookup(
    reservationId && options.reservationPeriod ? { [reservationId]: options.reservationPeriod } : {},
  );
  const scanAttempts = new FakeScanAttemptRepository();

  const useCase = new ScanTicketUseCase(
    venues as unknown as VenueRepositoryPort,
    tickets as unknown as TicketRepositoryPort,
    entitlements as unknown as EntitlementRepositoryPort,
    orders as unknown as OrderRepositoryPort,
    reservationPeriods,
    scanAttempts,
  );

  return {
    tenantId,
    venueId,
    otherVenueId: otherVenue.id,
    code,
    entitlementId,
    useCase,
    tickets,
    entitlements,
    scanAttempts,
  };
}

describe("ScanTicketUseCase", () => {
  describe("outcome classification (spec: access/scan - Scan outcome is classified unambiguously)", () => {
    it("authorizes an issued Entitlement at its own Venue with no Reservation", async () => {
      const s = buildScenario();

      const result = await s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: s.venueId });

      expect(result.outcome).toBe("authorized");
      expect(result.entitlementId).toBe(s.entitlementId);
      expect(s.entitlements.status).toBe("consumed");
    });

    it("authorizes a Reservation-backed Entitlement scanned within its period", async () => {
      const s = buildScenario({ reservationPeriod: "2026-06-15" });

      const result = await s.useCase.execute({
        tenantId: s.tenantId,
        code: s.code,
        venueId: s.venueId,
        now: new Date(2026, 5, 15, 10, 0),
      });

      expect(result.outcome).toBe("authorized");
      expect(s.entitlements.status).toBe("consumed");
    });

    it("reports an already-consumed Entitlement as already used (spec: Entitlement already consumed)", async () => {
      const s = buildScenario({ status: "consumed" });

      const result = await s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: s.venueId });

      expect(result.outcome).toBe("already_used");
      expect(s.entitlements.consumeCalls).toBe(0);
    });

    it("reports an unknown code as invalid and resolves no Entitlement (spec: Unknown or malformed code)", async () => {
      const s = buildScenario();

      const result = await s.useCase.execute({ tenantId: s.tenantId, code: "TCK-nao-existe", venueId: s.venueId });

      expect(result.outcome).toBe("invalid");
      expect(result.entitlementId).toBeNull();
      expect(s.entitlements.status).toBe("issued");
    });

    it("reports a Ticket sold for another Venue as wrong venue (spec: Wrong venue is detected against the Order's Venue)", async () => {
      const s = buildScenario();

      const result = await s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: s.otherVenueId });

      expect(result.outcome).toBe("wrong_venue");
      expect(s.entitlements.status).toBe("issued");
    });

    it("reports wrong venue even when the Entitlement is already consumed (spec: regardless of the Entitlement's other state)", async () => {
      const s = buildScenario({ status: "consumed" });

      const result = await s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: s.otherVenueId });

      expect(result.outcome).toBe("wrong_venue");
    });

    it("reports a scan before the Reservation's period as wrong time", async () => {
      const s = buildScenario({ reservationPeriod: "2026-06-15" });

      const result = await s.useCase.execute({
        tenantId: s.tenantId,
        code: s.code,
        venueId: s.venueId,
        now: new Date(2026, 5, 14, 20, 0),
      });

      expect(result.outcome).toBe("wrong_time");
      expect(s.entitlements.status).toBe("issued");
    });

    it("reports a scan after the Reservation's period as expired", async () => {
      const s = buildScenario({ reservationPeriod: "2026-06-15" });

      const result = await s.useCase.execute({
        tenantId: s.tenantId,
        code: s.code,
        venueId: s.venueId,
        now: new Date(2026, 5, 16, 9, 0),
      });

      expect(result.outcome).toBe("expired");
      expect(s.entitlements.status).toBe("issued");
    });
  });

  describe("wrong time and expired apply only to Reservation-backed Entitlements", () => {
    it("does not reject a Reservation-less Entitlement for time reasons, however far the clock is moved", async () => {
      for (const now of [new Date(2000, 0, 1), new Date(2099, 11, 31)]) {
        const s = buildScenario();

        const result = await s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: s.venueId, now });

        expect(result.outcome).toBe("authorized");
      }
    });
  });

  describe("concurrency (spec: Concurrent scans of the same Entitlement)", () => {
    it("reports the loser of the guarded update as already used, not authorized", async () => {
      const s = buildScenario();
      s.entitlements.loseRace = true;

      const result = await s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: s.venueId });

      expect(result.outcome).toBe("already_used");
      expect(s.entitlements.consumeCalls).toBe(1);
    });
  });

  describe("every attempt is recorded (spec: access/scan - Every scan attempt is recorded)", () => {
    it("records an authorized attempt against its Entitlement", async () => {
      const s = buildScenario();

      await s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: s.venueId });

      expect(s.scanAttempts.recorded).toHaveLength(1);
      expect(s.scanAttempts.recorded[0]).toMatchObject({
        outcome: "authorized",
        entitlementId: s.entitlementId,
        ticketCode: s.code,
        venueId: s.venueId,
      });
    });

    it("records a denied attempt, including one whose code matched nothing", async () => {
      const s = buildScenario();

      await s.useCase.execute({ tenantId: s.tenantId, code: "TCK-nao-existe", venueId: s.venueId });

      expect(s.scanAttempts.recorded).toHaveLength(1);
      expect(s.scanAttempts.recorded[0]?.outcome).toBe("invalid");
      expect(s.scanAttempts.recorded[0]?.entitlementId).toBeNull();
      expect(s.scanAttempts.recorded[0]?.ticketCode).toBe("TCK-nao-existe");
    });

    it("stamps the attempt with the same instant the scan was classified against", async () => {
      const s = buildScenario({ reservationPeriod: "2026-06-15" });
      const now = new Date(2026, 5, 16, 9, 0);

      const result = await s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: s.venueId, now });

      expect(result.scannedAt).toEqual(now);
      expect(s.scanAttempts.recorded[0]?.scannedAt).toEqual(now);
    });
  });

  describe("consumption happens only on the authorized path", () => {
    const denials: Array<{ name: string; scenario: ScenarioOptions; code?: string; venue?: "other"; now?: Date }> = [
      { name: "already used", scenario: { status: "consumed" } },
      { name: "invalid", scenario: {}, code: "TCK-nao-existe" },
      { name: "wrong venue", scenario: {}, venue: "other" },
      { name: "wrong time", scenario: { reservationPeriod: "2026-06-15" }, now: new Date(2026, 5, 14, 20, 0) },
      { name: "expired", scenario: { reservationPeriod: "2026-06-15" }, now: new Date(2026, 5, 16, 9, 0) },
    ];

    for (const denial of denials) {
      it(`leaves the Entitlement's status unchanged on a ${denial.name} scan`, async () => {
        const s = buildScenario(denial.scenario);
        const statusBefore = s.entitlements.status;
        const venueId = denial.venue === "other" ? s.otherVenueId : s.venueId;

        const result = await s.useCase.execute({
          tenantId: s.tenantId,
          code: denial.code ?? s.code,
          venueId,
          now: denial.now,
        });

        expect(result.outcome).not.toBe("authorized");
        expect(s.entitlements.consumeCalls).toBe(0);
        expect(s.entitlements.status).toBe(statusBefore);
        expect(s.scanAttempts.recorded).toHaveLength(1);
        expect(s.scanAttempts.recorded[0]?.outcome).toBe(result.outcome);
      });
    }
  });

  describe("the scanning session's Venue (spec: Scan is evaluated against an explicitly selected Venue)", () => {
    it("rejects a request with no Venue before looking the Ticket up", async () => {
      const s = buildScenario();

      await expect(
        s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: "" }),
      ).rejects.toBeInstanceOf(UnknownScanVenueError);
      expect(s.tickets.lookups).toBe(0);
      expect(s.scanAttempts.recorded).toHaveLength(0);
      expect(s.entitlements.status).toBe("issued");
    });

    it("rejects a Venue that is not one of the caller's own (design.md D1)", async () => {
      const s = buildScenario();

      await expect(
        s.useCase.execute({ tenantId: s.tenantId, code: s.code, venueId: randomUUID() }),
      ).rejects.toBeInstanceOf(UnknownScanVenueError);
      expect(s.tickets.lookups).toBe(0);
      expect(s.scanAttempts.recorded).toHaveLength(0);
    });
  });
});
