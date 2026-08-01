import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createAnonReportsClient,
  getPublishedCommunityReport,
  getReportContent,
} from "@/lib/public-reports";

export const metadata: Metadata = {
  title: "Community report — IRAAC",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const publishedDate = (iso: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(date);
};

/**
 * Public (anonymous) detail page for one published community report.
 *
 * Reads through the anon-key client: RLS plus the query filters guarantee
 * only a published, non-retracted community_public document (and the version
 * content whose parent is exactly that) can render. Content is displayed as
 * plain text inside <pre> — React escapes it, so raw HTML in the markdown
 * snapshot can never execute. If the report or its latest version content is
 * not publicly readable, the page 404s.
 */
export default async function CommunityReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = createAnonReportsClient();

  const report = await getPublishedCommunityReport(client, id);
  if (!report) notFound();

  const content = await getReportContent(client, id, report.current_version);
  if (content === null) notFound();

  return (
    <main lang="en" className="community-report">
      <article>
        <h1>{report.title}</h1>
        {publishedDate(report.published_at) && (
          <p>Published {publishedDate(report.published_at)}</p>
        )}
        <p role="note">
          This is a snapshot of the report as published. It may be updated in
          later versions.
        </p>
        <pre className="community-report-content">{content}</pre>
      </article>
    </main>
  );
}
