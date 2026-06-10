import { env } from "./env";

// Busca best-effort de referências visuais por segmento no Freepik/Behance.
//
// AVISO: scraping desses sites é frágil (eles bloqueiam bots, renderizam por JS
// e mudam o HTML) e fica nos limites dos termos de uso. Tudo aqui é envolto em
// try/catch e retorna [] quando falha — o gerador então cai nas artes da marca.
// Para algo confiável, use a Freepik API oficial (precisa de API key paga).

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      // Não trava a geração se o site demorar.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function unique(urls: string[]): string[] {
  return Array.from(new Set(urls));
}

/** Extrai thumbnails do HTML de busca do Freepik. */
async function searchFreepik(query: string): Promise<string[]> {
  const url = `https://www.freepik.com/search?format=search&query=${encodeURIComponent(
    query
  )}&type=vector`;
  const html = await fetchHtml(url);
  if (!html) return [];
  const matches = html.match(/https:\/\/img\.freepik\.com\/[^"'\\\s)]+/g) ?? [];
  return unique(
    matches.filter((u) => /\.(jpg|jpeg|png|webp)/i.test(u) && !u.includes("avatar"))
  );
}

/** Extrai capas de projetos do HTML de busca do Behance. */
async function searchBehance(query: string): Promise<string[]> {
  const url = `https://www.behance.net/search/projects?search=${encodeURIComponent(
    query
  )}`;
  const html = await fetchHtml(url);
  if (!html) return [];
  const matches =
    html.match(
      /https:\/\/mir-s3-cdn-cf\.behance\.net\/[^"'\\\s)]+\.(?:jpg|jpeg|png|webp)/gi
    ) ?? [];
  return unique(matches.filter((u) => /project_modules|projects/.test(u)));
}

/**
 * Retorna até `limit` URLs de imagens de referência para o segmento informado.
 * Tenta Freepik e depois Behance; combina e corta. Nunca lança — retorna [].
 */
export async function searchSegmentReferences(
  segment: string,
  limit = 2
): Promise<string[]> {
  if (!env.references.scrape || !segment.trim()) return [];

  const query = `${segment} flyer promotional design`;
  const results: string[] = [];

  try {
    const freepik = await searchFreepik(query);
    results.push(...freepik.slice(0, limit));
  } catch {
    /* ignore */
  }

  if (results.length < limit) {
    try {
      const behance = await searchBehance(query);
      results.push(...behance.slice(0, limit - results.length));
    } catch {
      /* ignore */
    }
  }

  return unique(results).slice(0, limit);
}
