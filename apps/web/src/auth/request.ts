export function isSameOriginMutation(request: Request): boolean {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin && origin !== expectedOrigin) {
    return false;
  }

  return !fetchSite || fetchSite === "same-origin";
}
