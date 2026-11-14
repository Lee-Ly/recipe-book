const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
// Instagram and Facebook serve their public preview tags (caption, image) to this crawler.
const CRAWLER_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

export function isSocialHost(hostname: string): boolean {
  return /(^|\.)(instagram\.com|facebook\.com|fb\.watch|fb\.com)$/i.test(hostname);
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h === "::1") return true;
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80");
}

export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("That doesn't look like a valid link.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) links are supported.");
  if (isPrivateHost(url.hostname)) throw new Error("That address isn't allowed.");
  return url;
}

export async function safeFetch(url: URL, timeoutMs = 15000): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      "user-agent": isSocialHost(url.hostname) ? CRAWLER_UA : BROWSER_UA,
      "accept-language": "he,en;q=0.8",
      accept: "text/html,application/xhtml+xml,image/*,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  // Re-check after redirects so a public link can't bounce us to a private address.
  parsePublicUrl(res.url);
  return res;
}
