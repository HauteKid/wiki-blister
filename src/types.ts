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

export type WikiCard = {
  pageid: number;
  title: string;
  extract: string;
  thumbnailUrl: string | null;
  articleUrl: string;
  /** Календарная дата по Москве (YYYY-MM-DD), когда карточка попала в коллекцию */
  openedMskDate: string;
  /** Редкость; для старых записей без поля подразумевается common */
  rarity?: CardRarity;
  /** Категория по P31; старые карточки без поля — «Разное» */
  category?: CardCategory;
};

export type TodaysPack = {
  mskDate: string;
  cards: WikiCard[];
};
