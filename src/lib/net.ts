// The agent fetches URLs that a model suggested, so treat them as untrusted:
// only public http(s) hosts, never localhost, link-local or private ranges
// (stops the server from being pointed at cloud metadata or internal services).

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function privateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function privateV6(ip: string) {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true;
  if (s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80")) return true;
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? privateV4(mapped[1]) : false;
}

function privateAddr(ip: string) {
  return isIP(ip) === 4 ? privateV4(ip) : isIP(ip) === 6 ? privateV6(ip) : true;
}

export async function isSafePublicUrl(raw: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || /\.(local|internal|localhost|lan|home|corp)$/.test(host)) return false;
  if (isIP(host)) return !privateAddr(host);
  try {
    const addrs = await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateAddr(a.address));
  } catch {
    return false;
  }
}
