import { describe, expect, it, vi } from "vitest";
import { logger } from "../lib/log";

describe("logger (OPS-001 no-PII rule)", () => {
  it("emits structured JSON with level, msg, ts", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hello", { a: 1 });
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("hello");
    expect(parsed.a).toBe(1);
    expect(typeof parsed.ts).toBe("string");
    spy.mockRestore();
  });

  it("strips a known PII key at top level", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("submit", { email: "victim@example.com", ok: true });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.email).toBe("[REDACTED]");
    expect(parsed.ok).toBe(true);
    spy.mockRestore();
  });

  it("strips PII keys nested in objects and arrays", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("batch", {
      items: [{ name: "Test Person", mobile: "0400000000" }],
      meta: { token: "tok123", count: 2 },
    });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.items[0].name).toBe("[REDACTED]");
    expect(parsed.items[0].mobile).toBe("[REDACTED]");
    expect(parsed.meta.token).toBe("[REDACTED]");
    expect(parsed.meta.count).toBe(2);
    spy.mockRestore();
  });

  it("strips survey answer payloads", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("submit", { sessionId: "abc", answers: { A01: "Yes" } });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.sessionId).toBe("[REDACTED]");
    expect(parsed.answers).toBe("[REDACTED]");
    spy.mockRestore();
  });

  it("logs errors to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("boom", { code: 500 });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.code).toBe(500);
    spy.mockRestore();
  });
});
