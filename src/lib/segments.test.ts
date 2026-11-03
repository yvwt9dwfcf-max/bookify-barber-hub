import { describe, it, expect } from "vitest";
import { getSegment, consumesProfessionalSeat, isSubscriptionUsable } from "./segments";

describe("segments", () => {
  it("automotive uses Detalhador", () => expect(getSegment("automotive").professional).toBe("Detalhador"));
  it("unknown falls back to barbershop", () => expect(getSegment("x").professional).toBe("Barbeiro"));
  it("receptionist does not consume seat", () => expect(consumesProfessionalSeat({ role: "receptionist" })).toBe(false));
  it("manager-only owner does not consume seat", () => expect(consumesProfessionalSeat({ role: "master", ownerAttends: false })).toBe(false));
  it("attending owner consumes seat", () => expect(consumesProfessionalSeat({ role: "master", ownerAttends: true })).toBe(true));
  it("expired subscription unusable", () =>
    expect(isSubscriptionUsable({ expires_at: "2026-01-01", uses_count: 0 }, null, new Date("2026-02-01"))).toBe(false));
  it("limit reached unusable", () =>
    expect(isSubscriptionUsable({ expires_at: "2026-12-31", uses_count: 4 }, 4, new Date("2026-02-01"))).toBe(false));
  it("unlimited usable", () =>
    expect(isSubscriptionUsable({ expires_at: "2026-12-31", uses_count: 99 }, null, new Date("2026-02-01"))).toBe(true));
});
