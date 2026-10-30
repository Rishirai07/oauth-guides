// A readable label for a source. Search results often come back titled with
// just the domain ("developers.hubspot.com"), which is useless when three
// sources share it, so fall back to host + path.
export function sourceLabel(s: { title?: string; url: string }): string {
  let host = "";
  let path = "";
  try {
    const u = new URL(s.url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname.replace(/\/$/, "");
  } catch {
    return s.title || s.url;
  }
  const t = (s.title || "").trim();
  const titleIsHost = !t || t.replace(/^www\./, "") === host || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t);
  if (!titleIsHost) return t;
  return path && path !== "/" ? `${host}${path}` : host;
}
