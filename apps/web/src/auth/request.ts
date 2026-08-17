export function isSameOriginMutation(request: Request): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return false;
  }

  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin && origin !== expectedOrigin) {
    return false;
  }

  if (fetchSite && fetchSite !== "same-origin") {
    return false;
  }

  return Boolean(origin || fetchSite);
}
