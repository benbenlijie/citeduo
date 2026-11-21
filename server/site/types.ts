import type { SiteLocale } from './facts'

export type ArticleCategory = 'guides' | 'compare' | 'docs'

export interface ArticleSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
  table?: {
    headers: string[]
    rows: string[][]
  }
  code?: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface HowToStep {
  name: string
  text: string
}

export interface HowToSpec {
  name: string
  steps: HowToStep[]
}

export interface LocalizedArticle {
  title: string
  metaTitle: string
  description: string
  eyebrow: string
  summaryAnswer: string
  ctaLabel: string
  ctaHref: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  faq?: FaqItem[]
  howTo?: HowToSpec
  sections: ArticleSection[]
  sources: { label: string; url: string }[]
}

export interface SiteArticleSpec {
  id: string
  category: ArticleCategory
  slug: string
  publishedAt: string
  updatedAt: string
  relatedIds: string[]
  en: LocalizedArticle
  zh: LocalizedArticle
}

export interface ResolvedPageMeta {
  locale: SiteLocale
  htmlLang: 'en' | 'zh-CN'
  hreflangSelf: 'en' | 'zh-Hans'
  title: string
  description: string
  canonicalPath: string
  enPath: string
  zhPath: string
  publishedAt?: string
  updatedAt: string
  ogType: 'website' | 'article'
}
