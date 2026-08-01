import { describe, expect, it, vi } from "vitest";
import {
  listReports,
  getReport,
  listReportVersions,
  transitionReport,
  SYNTHETIC_ACTOR_ID,
} from "../lib/report-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

type FakeClient = {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

/**
 * Chainable PostgREST-style fake. select() and eq()/order() return the same
 * builder (chainable); the TERMINAL call (maybeSingle for single-row, or the
 * awaited .select() when it is the final link for list queries) resolves the
 * recorded rows. The real call shapes:
 *   listReports:       from().select().order()            -> terminal order
 *   getReport:         from().select().eq().maybeSingle() -> terminal maybeSingle
 *   listReportVersions: from().select().order()           -> terminal order
 * We make BOTH .select() and .order()/eq() resolvable, but only the last link
 * in the chain is awaited by the code under test, so any terminal returns rows.
 */
function fakeClient(rows: unknown[] | null, error: unknown = null): FakeClient {
  const builder = {
    select: vi.fn(function (this: unknown) {
      return this;
    }),
    order: vi.fn(function (this: unknown) {
      return this;
    }),
    eq: vi.fn(function (this: unknown) {
      return this;
    }),
    maybeSingle: vi.fn().mockResolvedValue(
      rows && rows.length === 1 ? { data: rows[0], error } : { data: null, error },
    ),
    // For list queries the code awaits .order(...) as the terminal call; give
    // it the same resolution shape as maybeSingle.
    then: undefined as unknown,
  };

  // .order() is terminal for list queries — resolve rows there.
  builder.order.mockImplementation(() =>
    Promise.resolve({ data: rows, error }),
  );

  return {
    from: vi.fn().mockReturnValue(builder),
    rpc: vi.fn().mockResolvedValue({ data: { report_id: "r1", status: "published", current_version: 2 }, error: null }),
  } as unknown as FakeClient;
}

const ROW = {
  id: "70000000-0000-0000-0000-0000000000d1",
  title: "Synthetic community report",
  audience: "community_public",
  status: "published",
  snapshot_id: "70000000-0000-0000-0000-000000000001",
  current_version: 2,
  content_hash: "abc",
  published_at: "2026-08-02T00:00:00Z",
  retracted_at: null,
  retract_reason: null,
  updated_at: "2026-08-02T00:00:00Z",
};

describe("report-admin", () => {
  it("listReports maps rows and orders by updated_at desc", async () => {
    const client = fakeClient([ROW]);
    const rows = await listReports(client as unknown as SupabaseClient);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Synthetic community report");
    expect(rows[0].status).toBe("published");
    const selectCall = client.from.mock.results[0].value;
    expect(selectCall.order).toHaveBeenCalledWith("updated_at", { ascending: false });
  });

  it("listReports fails closed to [] on error", async () => {
    const client = fakeClient(null, { message: "boom" });
    const rows = await listReports(client as unknown as SupabaseClient);
    expect(rows).toEqual([]);
  });

  it("getReport returns the row", async () => {
    const client = fakeClient([ROW]);
    const row = await getReport(client as unknown as SupabaseClient, ROW.id);
    expect(row?.id).toBe(ROW.id);
  });

  it("getReport returns null when no row", async () => {
    const client = fakeClient([]);
    const row = await getReport(client as unknown as SupabaseClient, ROW.id);
    expect(row).toBeNull();
  });

  it("listReportVersions maps version rows oldest first", async () => {
    const v1 = { version: 1, content: "one", content_hash: "h1", change_note: "draft", created_at: "t1" };
    const v2 = { version: 2, content: "two", content_hash: "h2", change_note: "edit", created_at: "t2" };
    const client = fakeClient([v1, v2]);
    const versions = await listReportVersions(client as unknown as SupabaseClient, ROW.id);
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe(1);
  });

  it("transitionReport calls rpc with exactly the p_* args and synthetic actor", async () => {
    const client = fakeClient([]);
    await transitionReport(client as unknown as SupabaseClient, {
      reportId: ROW.id,
      nextStatus: "published",
      reason: "go",
      content: "# new",
      changeNote: "final",
    });
    expect(client.rpc).toHaveBeenCalledWith("transition_report", {
      p_report_id: ROW.id,
      p_next_status: "published",
      p_actor: SYNTHETIC_ACTOR_ID,
      p_reason: "go",
      p_content: "# new",
      p_change_note: "final",
    });
  });

  it("transitionReport passes nulls when omitted", async () => {
    const client = fakeClient([]);
    await transitionReport(client as unknown as SupabaseClient, {
      reportId: ROW.id,
      nextStatus: "draft",
    });
    expect(client.rpc).toHaveBeenCalledWith("transition_report", {
      p_report_id: ROW.id,
      p_next_status: "draft",
      p_actor: SYNTHETIC_ACTOR_ID,
      p_reason: null,
      p_content: null,
      p_change_note: null,
    });
  });

  it("transitionReport throws the Postgres message on rpc error", async () => {
    const client = fakeClient([]);
    client.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid report transition: published -> draft" },
    });
    await expect(
      transitionReport(client as unknown as SupabaseClient, { reportId: ROW.id, nextStatus: "draft" }),
    ).rejects.toThrow("Invalid report transition: published -> draft");
  });

  it("transitionReport throws when rpc returns no data and no error", async () => {
    const client = fakeClient([]);
    client.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      transitionReport(client as unknown as SupabaseClient, { reportId: ROW.id, nextStatus: "draft" }),
    ).rejects.toThrow("Report transition returned no result");
  });
});
