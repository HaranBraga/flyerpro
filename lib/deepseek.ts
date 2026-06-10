import OpenAI from "openai";
import { env } from "./env";

// Deepseek is OpenAI-API compatible.
const client = new OpenAI({
  apiKey: env.deepseek.apiKey,
  baseURL: env.deepseek.baseUrl,
});

export type BrandContext = {
  name: string;
  industry?: string | null;
  tone?: string | null;
  styleDescription?: string | null;
  palette?: string[] | null;
};

const SYSTEM_PROMPT = `Você é o diretor de arte de uma agência. Sua função é transformar o
briefing de um flyer em um PROMPT DE IMAGEM em inglês, detalhado e fiel à identidade visual da marca,
para um modelo text-to-image (Grok Imagine).

Regras:
- Responda APENAS com o prompt de imagem, sem explicações nem aspas.
- Mantenha consistência com a paleta, o tom e o estilo da marca informados.
- Descreva composição, iluminação, estilo gráfico, paleta de cores (cite os HEX) e clima.
- O usuário pediu que o TEXTO do flyer seja renderizado pela própria IA: inclua no prompt o texto
  principal exatamente como deve aparecer, entre aspas, com instruções de layout (ex.: título grande
  no topo, oferta em destaque, data no rodapé). Mantenha o texto curto e legível.
- Não invente a marca: use só o que foi dado. Formato vertical de flyer (proporção 4:5) por padrão.`;

/** Build the final image prompt from brand kit + the user's flyer brief. */
export async function buildFlyerPrompt(
  brand: BrandContext,
  brief: string
): Promise<string> {
  const brandBlock = [
    `Marca: ${brand.name}`,
    brand.industry ? `Segmento: ${brand.industry}` : null,
    brand.tone ? `Tom/voz: ${brand.tone}` : null,
    brand.styleDescription ? `Estilo visual: ${brand.styleDescription}` : null,
    brand.palette?.length ? `Paleta (HEX): ${brand.palette.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: env.deepseek.model,
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `IDENTIDADE DA MARCA:\n${brandBlock}\n\nBRIEFING DO FLYER:\n${brief}`,
      },
    ],
  });

  const prompt = completion.choices[0]?.message?.content?.trim();
  if (!prompt) throw new Error("Deepseek não retornou um prompt.");
  return prompt;
}

/** Infer brand tone/style from a short description (used during onboarding). */
export async function inferBrandStyle(
  name: string,
  industry: string,
  description: string
): Promise<{ tone: string; styleDescription: string }> {
  const completion = await client.chat.completions.create({
    model: env.deepseek.model,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `Você é estrategista de marca. A partir dos dados, responda em JSON válido com as
chaves "tone" (tom/voz da marca, 1-2 frases) e "styleDescription" (direção visual recorrente para os
flyers: estilo gráfico, cores, clima — 2-3 frases). Responda apenas o JSON.`,
      },
      {
        role: "user",
        content: `Nome: ${name}\nSegmento: ${industry}\nDescrição: ${description}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      tone: String(parsed.tone ?? ""),
      styleDescription: String(parsed.styleDescription ?? ""),
    };
  } catch {
    return { tone: "", styleDescription: "" };
  }
}
