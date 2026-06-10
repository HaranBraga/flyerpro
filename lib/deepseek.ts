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
briefing de um flyer em um PROMPT DE IMAGEM em inglês, detalhado e fiel à identidade visual da marca.
O prompt vai para um modelo de IMAGE-TO-IMAGE (Grok Imagine edit) que recebe imagens de referência
junto com o texto.

Regras:
- Responda APENAS com o prompt de imagem, em inglês, sem explicações nem aspas em volta.
- Crie um flyer ORIGINAL e NOVO — NÃO copie o texto, marca ou logotipos que aparecem nas imagens de
  referência de estilo. Elas servem só de inspiração de composição, cores e clima.
- Mantenha consistência com a paleta (cite os HEX), o tom e o estilo da marca.
- Descreva composição, hierarquia visual, iluminação, estilo gráfico e clima.
- O TEXTO do flyer deve ser renderizado pela própria IA: inclua o texto principal exatamente como deve
  aparecer, entre aspas, com layout (ex.: título grande no topo, oferta em destaque, data/CTA no rodapé).
  Mantenha o texto curto, correto e legível.
- Não invente dados da marca: use só o que foi dado. Formato vertical de flyer (4:5) por padrão.`;

type RefContext = { hasLogo: boolean; styleRefCount: number };

/** Instruções sobre como usar as imagens de referência passadas ao modelo. */
function referenceGuidance(ctx: RefContext): string {
  const lines: string[] = [];
  if (ctx.hasLogo) {
    lines.push(
      "A PRIMEIRA imagem de referência é a LOGO oficial da empresa: exiba-a com destaque, " +
        "mantenha-a intacta (sem distorcer, recolorir ou redesenhar) e integre-a ao layout."
    );
  }
  if (ctx.styleRefCount > 0) {
    lines.push(
      `As outras ${ctx.styleRefCount} imagem(ns) são REFERÊNCIAS DE ESTILO: use-as apenas para ` +
        "inspirar composição, paleta e clima. NÃO reproduza o texto, produtos ou marcas delas."
    );
  }
  if (lines.length === 0) {
    return "Não há imagens de referência: gere o flyer do zero seguindo a identidade da marca.";
  }
  return "USO DAS IMAGENS DE REFERÊNCIA:\n" + lines.map((l) => `- ${l}`).join("\n");
}

/** Build the final image prompt from brand kit + the user's flyer brief. */
export async function buildFlyerPrompt(
  brand: BrandContext,
  brief: string,
  refContext: RefContext = { hasLogo: false, styleRefCount: 0 }
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
        content: `IDENTIDADE DA MARCA:\n${brandBlock}\n\n${referenceGuidance(
          refContext
        )}\n\nBRIEFING DO FLYER:\n${brief}`,
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
