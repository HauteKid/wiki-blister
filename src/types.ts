export type CardRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

/** Тематическая категория по Wikidata P31 (см. `lib/cardCategory.ts`). */
export type CardCategory =
  | "person"
  | "country"
  | "place"
  | "event"
  | "culture"
  | "science"
  | "org"
  | "other";

/**
 * Уточнение для category === «other» (артефакт, технология, вид, понятие).
 * См. `inferOtherSubcategory` в `lib/cardCategory.ts`.
 */
export type CardOtherSubcategory = "artifact" | "technology" | "species" | "concept" | "other";

/** Выбранные утверждения Wikidata для донастройки редкости (см. `lib/cardCategory.ts`). */
export type WikidataClaims = {
  p106?: string[];
  p166?: string[];
  p800?: string[];
  p17?: string[];
  p1435?: string[];
  /** Подкласс (один шаг P279) — для науки и узких типов без рекурсии по графу */
  p279?: string[];
  birthYear?: number;
  deathYear?: number;
  /** Год события (P585 / P580 / P582), если удалось извлечь */
  eventYear?: number;
};

export type WikiCard = {
  pageid: number;
  title: string;
  extract: string;
  thumbnailUrl: string | null;
  articleUrl: string;
  /** Календарная дата по Москве (YYYY-MM-DD), когда карточка попала в коллекцию */
  openedMskDate: string;
  /**
   * Редкость в коллекции и на карточке (после открытия совпадает с intrinsic,
   * если не вводили отдельный «выпавший» тир).
   */
  rarity?: CardRarity;
  /**
   * Внутренняя редкость по формуле значимости (ТЗ: отдельно от веса выпадения в пуле).
   * Веса отбора в блистере берутся от этого значения.
   */
  intrinsicRarity?: CardRarity;
  /** Категория по P31; старые карточки без поля — «Разное» */
  category?: CardCategory;
  /** Для «Разное»: подтип по P31 */
  otherSubcategory?: CardOtherSubcategory;
  /** 0…1 — прокси качества статьи по длине анонса (для формулы редкости) */
  pageQuality?: number;
  /** Пользователь отметил карточку в избранном (детальный просмотр) */
  favorite?: boolean;
};

export type TodaysPack = {
  mskDate: string;
  cards: WikiCard[];
};
