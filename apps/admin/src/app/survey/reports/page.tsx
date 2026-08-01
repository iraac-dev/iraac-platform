import type { Metadata } from "next";
import Link from "next/link";
import {
  createAnonReportsClient,
  listPublishedCommunityReports,
} from "@/lib/public-reports";

export const metadata: Metadata = {
  title: "Community reports — IRAAC",
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
 * Public (anonymous) listing of published community reports. Rendered with
 * the anon-key client so RLS is the access boundary: only published,
 * non-retracted community_public documents can ever appear here. No client
 * JS, no admin links.
 */
export default async function CommunityReportsPage() {
  const client = createAnonReportsClient();
  const reports = await listPublishedCommunityReports(client);

  return (
    <main lang="en" className="community-reports">
      <h1>Community reports</h1>
      <p>
        Reports we have published back to community from the Have Your Say
        survey.
      </p>

      {reports.length === 0 ? (
        <p>No community reports have been published yet.</p>
      ) : (
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              <article>
                <h2>
                  <Link href={`/survey/reports/${report.id}`}>
                    {report.title}
                  </Link>
                </h2>
                {publishedDate(report.published_at) && (
                  <p>Published {publishedDate(report.published_at)}</p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
