import { EventType } from '@/types/sales';

export interface PortfolioImage {
  id: string;
  itemId: string;
  storagePath: string;
  altText: string;
  width?: number | null;
  height?: number | null;
  sort: number;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  eventType: EventType;
  description?: string | null;
  shootDate?: string | null;
  coverImagePath?: string | null;
  videoUrl?: string | null;
  tags?: string[];
  sort: number;
  isPublished: boolean;
  clientConsentConfirmedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  images?: PortfolioImage[];
}

export interface SitePageSeo {
  pageKey: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImagePath?: string | null;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
