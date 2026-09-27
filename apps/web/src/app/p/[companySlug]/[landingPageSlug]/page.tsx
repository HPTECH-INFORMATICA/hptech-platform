import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { publicLandingPageBackendPath } from "@/lib/public-landing-page-routes";
import { publicBackendFetch } from "@/server/public-backend";
import type { PublicLandingPageData } from "@/services/landing-page-service";

import PublicLandingPageRenderer from "./PublicLandingPageRenderer";

type PublicLandingPageParams = {
  companySlug: string;
  landingPageSlug: string;
};

type PublicLandingPageProps = {
  params: Promise<PublicLandingPageParams>;
};

const loadPublicLandingPage = cache(
  async ({ companySlug, landingPageSlug }: PublicLandingPageParams) => {
    const path = publicLandingPageBackendPath(companySlug, landingPageSlug);
    if (!path) return null;

    const response = await publicBackendFetch(path, {
      next: { revalidate: 60 },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Public landing page request failed: ${response.status}`);
    }
    return response.json() as Promise<PublicLandingPageData>;
  },
);

export async function generateMetadata({
  params,
}: PublicLandingPageProps): Promise<Metadata> {
  const page = await loadPublicLandingPage(await params);
  if (!page) return {};

  const title = page.seo.title ?? page.name;
  const description = page.seo.description ?? undefined;
  return {
    title,
    description,
    alternates: page.seo.canonical_url
      ? { canonical: page.seo.canonical_url }
      : undefined,
    robots: page.seo.no_index ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      siteName: page.company.name,
    },
  };
}

export default async function PublicLandingPage({
  params,
}: PublicLandingPageProps) {
  const page = await loadPublicLandingPage(await params);
  if (!page) notFound();
  return <PublicLandingPageRenderer page={page} />;
}
