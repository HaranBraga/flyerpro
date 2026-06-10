import { Vibrant } from "node-vibrant/node";

/**
 * Extract a small color palette (HEX) from a logo/image buffer.
 * Used to seed the Brand Kit during onboarding.
 */
export async function extractPalette(image: Buffer): Promise<string[]> {
  try {
    const palette = await Vibrant.from(image).getPalette();
    const swatches = [
      palette.Vibrant,
      palette.DarkVibrant,
      palette.LightVibrant,
      palette.Muted,
      palette.DarkMuted,
      palette.LightMuted,
    ];
    const hexes = swatches
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => s.hex);
    // De-duplicate while preserving order.
    return Array.from(new Set(hexes));
  } catch {
    return [];
  }
}
