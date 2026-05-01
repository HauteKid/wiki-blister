import type { CardRarity } from "../types";

/** Q-id → не выше «легендарной». Редактируйте список вручную. */
export const ENTITY_BLOCK_MYTHIC = new Set<string>([]);

/** Q-id → минимальная внутренняя редкость. */
export const ENTITY_INTRINSIC_FLOOR: Record<string, CardRarity> = {};
