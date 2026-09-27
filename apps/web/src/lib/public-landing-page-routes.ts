const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isPublicLandingPageSlug(value: string): boolean {
  return value.length >= 1 && value.length <= 120 && SLUG_PATTERN.test(value);
}

export function publicLandingPageBackendPath(
  companySlug: string,
  landingPageSlug: string,
): string | null {
  if (
    companySlug.length > 100 ||
    !isPublicLandingPageSlug(companySlug) ||
    !isPublicLandingPageSlug(landingPageSlug)
  ) {
    return null;
  }

  return `/public/landing-pages/${encodeURIComponent(companySlug)}/${encodeURIComponent(landingPageSlug)}`;
}

export function publicLandingPageSubmissionBackendPath(
  companySlug: string,
  landingPageSlug: string,
): string | null {
  const pagePath = publicLandingPageBackendPath(companySlug, landingPageSlug);
  return pagePath ? `${pagePath}/submissions` : null;
}
