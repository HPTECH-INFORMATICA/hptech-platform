export type LandingPageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type LandingPageTemplate = "BLANK" | "LEAD_CAPTURE" | "SERVICE_PROMOTION";

export type LandingPageAction = { label: string; href: string };
export type LandingPageBlock =
  | {
      id: string;
      type: "HERO";
      eyebrow: string | null;
      heading: string;
      body: string | null;
      primary_action: LandingPageAction | null;
    }
  | { id: string; type: "TEXT"; heading: string | null; body: string }
  | {
      id: string;
      type: "FEATURES";
      heading: string | null;
      items: Array<{ title: string; body: string }>;
    }
  | {
      id: string;
      type: "CALL_TO_ACTION";
      heading: string;
      body: string | null;
      action: LandingPageAction;
    }
  | {
      id: string;
      type: "FAQ";
      heading: string | null;
      items: Array<{ question: string; answer: string }>;
    }
  | {
      id: string;
      type: "CONTACT";
      heading: string;
      body: string | null;
      submit_label: string;
      success_message: string;
    };

export type LandingPageContent = { version: 1; blocks: LandingPageBlock[] };
export type LandingPageSeo = {
  title: string | null;
  description: string | null;
  canonical_url: string | null;
  no_index: boolean;
};

export type LandingPageData = {
  id: string;
  name: string;
  slug: string;
  status: LandingPageStatus;
  template: LandingPageTemplate;
  content: LandingPageContent;
  seo: LandingPageSeo;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LandingPageList = {
  items: LandingPageData[];
  total: number;
  page: number;
  page_size: number;
};

export type PublicLandingPageData = {
  name: string;
  slug: string;
  template: LandingPageTemplate;
  content: LandingPageContent;
  seo: LandingPageSeo;
  published_at: string;
  company: { name: string; slug: string };
};

export type PublicLandingPageSubmissionInput = {
  name: string;
  email?: string;
  phone?: string;
  privacy_consent: true;
  website?: string;
};

export type PublicLandingPageSubmissionResult = {
  accepted: true;
  message: string;
};

export type LandingPageCreateInput = {
  name: string;
  slug: string;
  template: LandingPageTemplate;
  content: LandingPageContent;
  seo: LandingPageSeo;
};

export type LandingPageUpdateInput = Partial<LandingPageCreateInput>;

export class LandingPageApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as
    | { detail?: string; error?: string }
    | null;
  throw new LandingPageApiError(
    response.status,
    body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
  );
}

async function requestLandingPage(
  path: string,
  init?: RequestInit,
): Promise<LandingPageData> {
  const response = await fetch(`/api/landing-pages${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) return parseError(response);
  return response.json() as Promise<LandingPageData>;
}

export async function listLandingPages(
  params: URLSearchParams,
): Promise<LandingPageList> {
  const response = await fetch(`/api/landing-pages?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return parseError(response);
  return response.json() as Promise<LandingPageList>;
}

export function createLandingPage(data: LandingPageCreateInput) {
  return requestLandingPage("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateLandingPage(id: string, data: LandingPageUpdateInput) {
  return requestLandingPage(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function transitionLandingPage(id: string, action: string) {
  return requestLandingPage(
    `/${encodeURIComponent(id)}/${encodeURIComponent(action)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
}

export function publishLandingPage(id: string) {
  return transitionLandingPage(id, "publish");
}

export function unpublishLandingPage(id: string) {
  return transitionLandingPage(id, "unpublish");
}

export function archiveLandingPage(id: string) {
  return transitionLandingPage(id, "archive");
}

export async function deleteLandingPage(id: string): Promise<void> {
  const response = await fetch(`/api/landing-pages/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return parseError(response);
}

export async function submitPublicLandingPage(
  companySlug: string,
  landingPageSlug: string,
  data: PublicLandingPageSubmissionInput,
): Promise<PublicLandingPageSubmissionResult> {
  const response = await fetch(
    `/api/public/landing-pages/${encodeURIComponent(companySlug)}/${encodeURIComponent(landingPageSlug)}/submissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    },
  );
  if (!response.ok) return parseError(response);
  return response.json() as Promise<PublicLandingPageSubmissionResult>;
}
