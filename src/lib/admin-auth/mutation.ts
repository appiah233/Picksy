// Importer mutations use an authenticated cookie session. A same-origin JSON
// request is required in addition to that session. The platform must supply a
// trusted host; AUTH_URL should be set to the canonical production origin.
export function validateAdminMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  const contentType = request.headers.get("content-type") ?? "";
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || !/^application\/json(?:\s*;|$)/i.test(contentType)) return false;
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  try {
    const expected = new URL(process.env.AUTH_URL ?? request.url).origin;
    return new URL(origin).origin === expected && origin === expected;
  } catch {
    return false;
  }
}
