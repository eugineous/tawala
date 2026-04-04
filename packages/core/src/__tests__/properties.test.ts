import * as fc from "fast-check";
import { allocateBudget } from "../finance";

/**
 * Property 1: Budget allocations sum to monthly income
 * Validates: Requirements 2.1
 */
describe("Property 1: Budget allocations sum to monthly income", () => {
  it("sum of all allocations equals monthly income within 1 KES rounding tolerance", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30000, max: 100000 }),
        (income) => {
          const result = allocateBudget(income, {
            rent: 15000,
            entertainment: 2500,
          });
          const { total: _total, ...allocations } = result;
          const sum = Object.values(allocations).reduce(
            (a: number, b: number) => a + b,
            0
          );
          return Math.abs(sum - income) < 1;
        }
      )
    );
  });
});
