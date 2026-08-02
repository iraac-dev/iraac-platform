import { describe, expect, it, vi } from "vitest";
import { logger } from "../lib/log";

describe("allowlisted operational logger", () => {
  it("emits trusted structured metadata", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("health_check_failure", { durationMs: 10 });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("health_check_failure");
    expect(parsed.durationMs).toBe(10);
    expect(typeof parsed.ts).toBe("string");
    spy.mockRestore();
  });

  it("drops arbitrary keys, payloads and forged metadata", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("survey_submit_failure", {
      emailAddress: "victim@example.com",
      raw_payload: { answers: "private" },
      level: "debug",
      event: "forged",
      ts: "forged",
    });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.emailAddress).toBeUndefined();
    expect(parsed.raw_payload).toBeUndefined();
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("survey_submit_failure");
    expect(parsed.ts).not.toBe("forged");
    spy.mockRestore();
  });

  it("rejects unsafe error type values", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("consent_submit_failure", { errorType: "person@example.com" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.errorType).toBeUndefined();
    spy.mockRestore();
  });
});
