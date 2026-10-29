import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

const fallbackAvatar = "digiforce-ai-assistant";
const cache = new Map<string, string>();

export function getAIEmployeeAvatar(
  seed?: string,
  options?: { flip?: boolean }
) {
  if (
    seed?.startsWith("data:") ||
    seed?.startsWith("blob:") ||
    /^https?:\/\//.test(seed ?? "")
  ) {
    return seed;
  }

  const avatarSeed = seed?.trim() || fallbackAvatar;
  const cacheKey = `${avatarSeed}:${
    options?.flip === true ? "flip" : "default"
  }`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const dataUri = createAvatar(bottts, {
    seed: avatarSeed,
    flip: options?.flip === true,
    scale: 100,
  }).toDataUri();

  cache.set(cacheKey, dataUri);
  return dataUri;
}
