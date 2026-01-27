export type Category = '국내' | '해외' | '스포츠' | '엔터' | '경제' | '가장 인기 있는';

export interface Article {
  title: string;
  lead: string;
  shortBody: string; // 200자 이하 요약문 (검증 대상)
  body: string;
  contextBox: string;
  keywords: string[];
  sourceName: string;
  sourceUrl: string;
  imageAlt: string;
  imageUrl?: string;
  category: Category;
}

export const CATEGORIES: Category[] = ['국내', '해외', '스포츠', '엔터', '경제', '가장 인기 있는'];
