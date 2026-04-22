export type CardRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

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
};

export type TodaysPack = {
  mskDate: string;
  cards: WikiCard[];
};
