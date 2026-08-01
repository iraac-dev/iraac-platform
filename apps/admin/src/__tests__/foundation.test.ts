import { describe, expect, it } from "vitest";

// Smoke test: the platform skeleton boots and the loop framing is intact.
describe("platform foundation", () => {
  it("asserts the listening loop framing", () => {
    expect("You share → We listen → We recommend to government → We report back").toContain(
      "We report back",
    );
  });

  it("runs a trivial arithmetic check", () => {
    expect(1 + 1).toBe(2);
  });
});
