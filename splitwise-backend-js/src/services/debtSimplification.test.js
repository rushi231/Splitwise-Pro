const { describe, it, expect } = require("vitest");
const { simplifyDebts } = require("./debtSimplification");

describe("simplifyDebts", () => {
  it("returns no suggestions when everyone is settled", () => {
    const result = simplifyDebts({ alice: 0, bob: 0 });
    expect(result).toEqual([]);
  });

  it("handles a simple two-person debt", () => {
    // bob owes alice $10
    const result = simplifyDebts({ alice: 1000, bob: -1000 });
    expect(result).toEqual([
      { fromUserId: "bob", toUserId: "alice", amountCents: 1000 },
    ]);
  });

  it("collapses a three-person cycle into fewer transactions", () => {
    // naive pairwise settling would take 3 txns, simplification
    // should do it in fewer.
    // alice is owed 500, bob is owed 500, carol owes 1000
    const result = simplifyDebts({ alice: 500, bob: 500, carol: -1000 });
    expect(result.length).toBe(2);
    const total = result.reduce((sum, r) => sum + r.amountCents, 0);
    expect(total).toBe(1000);
  });

  it("throws if credits and debits don't balance (ledger bug guard)", () => {
    expect(() => simplifyDebts({ alice: 500, bob: -400 })).toThrow(
      /Ledger inconsistency/
    );
  });

  it("ignores users who are already at zero", () => {
    const result = simplifyDebts({ alice: 1000, bob: -1000, carol: 0 });
    expect(
      result.every((r) => r.fromUserId !== "carol" && r.toUserId !== "carol")
    ).toBe(true);
  });
});
