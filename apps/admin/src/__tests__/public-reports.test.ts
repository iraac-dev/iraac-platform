import { describe, expect, it } from "vitest";
import {
  getPublishedCommunityReport,
  getReportContent,
  listPublishedCommunityReports,
} from "../lib/public-reports";

/**
 * Recording fake Supabase client (mirrors survey-submit.test.ts's fakes).
 * Every .from().select().eq()/.is()/.order()/.maybeSingle() call is logged so
 * tests can assert the exact filters the queries send to the API — the
 * community-safe shape that RLS then enforces server-side.
 */

interface QueryCall {
  table: string;
  select: string;
  filters: Array<[column: string, value: unknown]>;
  order?: [column: string, ascending: boolean];
  single: boolean;
}

interface FakeConfig {
  rows?: unknown[];
  single?: unknown;
  error?: unknown;
}

function fakeClient(config: FakeConfig = {}) {
  const calls: QueryCall[] = [];

  const builder = (
    table: string,
    select: string,
    filters: Array<[string, unknown]>,
    single: boolean,
  ) => ({
    select: (cols: string) => builder(table, cols, filters, single),
    eq: (column: string, value: unknown) =>
      builder(table, select, [...filters, [column, value]], single),
    is: (column: string, value: unknown) =>
      builder(table, select, [...filters, [column, value]], single),
    order: (column: string, opts: { ascending: boolean }) => {
      calls.push({ table, select, filters, order: [column, opts.ascending], single });
      return Promise.resolve(
        config.error ? { data: null, error: config.error } : { data: config.rows ?? [], error: null },
      );
    },
    maybeSingle: () => {
      calls.push({ table, select, filters, single: true });
      return Promise.resolve(
        config.error ? { data: null, error: config.error } : { data: config.single ?? null, error: null },
      );
    },
  });

  return {
    calls,
    from: (table: string) => builder(table, "", [] as Array<[string, unknown]>, false),
  };
}

const REPORT_COLUMNS =
  "id, title, audience, status, published_at, current_version, content_hash";

describe("listPublishedCommunityReports", () => {
  it("requests community_public + published + non-retracted rows, newest first, and maps them", async () => {
    const rows = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        title: "Listening Report 2026",
        audience: "community_public",
        status: "published",
        published_at: "2026-07-01T09:00:00Z",
        current_version: 2,
        content_hash: "abc123",
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        title: "Housing Report 2026",
        audience: "community_public",
        status: "published",
        published_at: "2026-06-15T09:00:00Z",
        current_version: 1,
        content_hash: "def456",
      },
    ];
    const client = fakeClient({ rows });

    const out = await listPublishedCommunityReports(client as never);

    expect(out).toEqual(rows);
    expect(client.calls).toHaveLength(1);
    const call = client.calls[0];
    expect(call.table).toBe("report_documents");
    expect(call.select).toBe(REPORT_COLUMNS);
    expect(call.filters).toEqual([
      ["audience", "community_public"],
      ["status", "published"],
      ["retracted_at", null],
    ]);
    expect(call.order).toEqual(["published_at", false]);
    expect(call.single).toBe(false);
  });

  it("fails closed to an empty list on a query error", async () => {
    const client = fakeClient({ error: { message: "boom" } });
    await expect(listPublishedCommunityReports(client as never)).resolves.toEqual([]);
  });
});

describe("getPublishedCommunityReport", () => {
  const row = {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Listening Report 2026",
    audience: "community_public",
    status: "published",
    published_at: "2026-07-01T09:00:00Z",
    current_version: 2,
    content_hash: "abc123",
  };

  it("returns the row for a readable id with the community-safe filters", async () => {
    const client = fakeClient({ single: row });

    const out = await getPublishedCommunityReport(
      client as never,
      "11111111-1111-1111-1111-111111111111",
    );

    expect(out).toEqual(row);
    const call = client.calls[0];
    expect(call.table).toBe("report_documents");
    expect(call.select).toBe(REPORT_COLUMNS);
    expect(call.filters).toEqual([
      ["audience", "community_public"],
      ["status", "published"],
      ["retracted_at", null],
      ["id", "11111111-1111-1111-1111-111111111111"],
    ]);
    expect(call.single).toBe(true);
  });

  it("returns null when the fake returns zero rows (not publicly readable)", async () => {
    const client = fakeClient({ single: null });
    await expect(
      getPublishedCommunityReport(client as never, "99999999-9999-9999-9999-999999999999"),
    ).resolves.toBeNull();
  });

  it("returns null on a query error", async () => {
    const client = fakeClient({ error: { message: "boom" } });
    await expect(
      getPublishedCommunityReport(client as never, "11111111-1111-1111-1111-111111111111"),
    ).resolves.toBeNull();
  });
});

describe("getReportContent", () => {
  it("joins versions to the parent document with community-safe filters and returns content", async () => {
    const client = fakeClient({
      single: {
        content: "# Listening Report\n\nFindings…",
        report_documents: { audience: "community_public", status: "published" },
      },
    });

    const out = await getReportContent(
      client as never,
      "11111111-1111-1111-1111-111111111111",
      2,
    );

    expect(out).toBe("# Listening Report\n\nFindings…");
    const call = client.calls[0];
    expect(call.table).toBe("report_document_versions");
    expect(call.select).toBe("content, report_documents!inner(audience, status)");
    expect(call.filters).toEqual([
      ["document_id", "11111111-1111-1111-1111-111111111111"],
      ["version", 2],
      ["report_documents.audience", "community_public"],
      ["report_documents.status", "published"],
      ["report_documents.retracted_at", null],
    ]);
    expect(call.single).toBe(true);
  });

  it("returns null when the parent document is NOT community_public/published (zero rows)", async () => {
    // Simulates RLS/join dropping the version row because the parent document
    // is staff/government or not published: the query returns zero rows.
    const client = fakeClient({ single: null });

    await expect(
      getReportContent(client as never, "33333333-3333-3333-3333-333333333333", 1),
    ).resolves.toBeNull();
  });

  it("returns null on a query error", async () => {
    const client = fakeClient({ error: { message: "boom" } });
    await expect(
      getReportContent(client as never, "11111111-1111-1111-1111-111111111111", 2),
    ).resolves.toBeNull();
  });
});
