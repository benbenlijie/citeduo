import { describe, expect, test } from 'bun:test'
import { openDb } from '../db'
import { ensureUsageContext, recordClientEvent } from '../analytics'
import { articlePath, SITE_ARTICLES } from './content/articles'
import { categoryPath } from './content/categories'
import { HOME_COPY } from './content/home'
import { SITE_FACTS } from './facts'
import { handlePublicSiteRequest } from './router'

function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    blocks.push(JSON.parse(m[1]))
  }
  return blocks
}

describe('public site SSR, SEO metadata, hreflang, sitemap, and 404 semantics', () => {
  test('renders English landing page via /site/ with H1, canonical, hreflang, OG image, and valid JSON-LD', async () => {
    const req = new Request('https://citeduo.com/site/')
    const res = await handlePublicSiteRequest(req, new URL(req.url))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(200)
    expect(res!.headers.get('content-type')).toContain('text/html')

    const html = await res!.text()
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<h1>See how any two research papers are actually connected.</h1>')
    expect(html).toContain('<link rel="canonical" href="https://citeduo.com/">')
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://citeduo.com/">')
    expect(html).toContain('<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com/zh/">')
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://citeduo.com/">')
    expect(html).toContain('content="https://citeduo.com/site-assets/social-preview.jpg"')
    expect(html).not.toContain('watchdeep.net')

    // Deep-link example CTA points to verified pair in /papers/
    expect(html).toContain('/papers/?paper=2304.02643&amp;from=2304.02643&amp;to=2410.24164')
    expect(html).toContain('/papers/?paper=2406.09246&amp;from=2406.09246&amp;to=2307.15818')
    expect(html).toContain('OpenVLA cites RT-2')
    expect(html).not.toContain('to=2410.24164&amp;src=example_openvla-pi0-direct')

    const ld = extractJsonLd(html)
    expect(ld.length).toBeGreaterThanOrEqual(4)
    expect(ld.map((x) => x['@type'])).toEqual(
      expect.arrayContaining(['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage']),
    )
    expect(html).toContain('href="/guides/"')
    expect(html).toContain('href="/compare/"')
    expect(html).toContain('href="/about"')
    expect(html).toContain('<details><summary>What does CiteDuo do?</summary>')

    // Conversion beacons must follow the /papers/ sub-path, otherwise they hit
    // the parent site instead of this process.
    expect(html).toContain("var apiBase = (location.pathname === '/papers' || location.pathname.indexOf('/papers/') === 0) ? '/papers' : ''")
    expect(html).toContain("sendBeacon(apiBase + '/api/analytics/event'")

    // The beacon is inlined via a template literal, where "\\/" silently
    // collapses to "/". Parse it so a broken regex cannot ship.
    const beacon = html.match(/<script>\s*\(function\(\)\{[\s\S]*?apiBase[\s\S]*?<\/script>/)
    expect(beacon).not.toBeNull()
    expect(() => new Function(beacon![0].replace(/^<script>|<\/script>$/g, ''))).not.toThrow()
  })

  test('renders Simplified Chinese landing page at /zh/ and 301-redirects bare /zh preserving query string', async () => {
    const bare = new Request('https://citeduo.com/zh?utm_source=test')
    const bareRes = await handlePublicSiteRequest(bare, new URL(bare.url))
    expect(bareRes!.status).toBe(301)
    expect(bareRes!.headers.get('location')).toBe('/zh/?utm_source=test')

    const zh = new Request('https://citeduo.com/zh/')
    const zhRes = await handlePublicSiteRequest(zh, new URL(zh.url))
    expect(zhRes!.status).toBe(200)
    const html = await zhRes!.text()
    expect(html).toContain('<html lang="zh-CN">')
    expect(html).toContain('<h1>查清任意两篇学术论文到底是怎么连上的。</h1>')
    expect(html).toContain('<link rel="canonical" href="https://citeduo.com/zh/">')
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://citeduo.com/">')
    expect(html).toContain('<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com/zh/">')
  })

  test('renders bilingual About page with AboutPage and Organization schema', async () => {
    const enRes = await handlePublicSiteRequest(
      new Request('https://citeduo.com/about'),
      new URL('https://citeduo.com/about'),
    )
    expect(enRes!.status).toBe(200)
    const enHtml = await enRes!.text()
    expect(enHtml).toContain('<h1>What CiteDuo is — and what it is not</h1>')
    expect(enHtml).toContain('<link rel="canonical" href="https://citeduo.com/about">')
    expect(enHtml).toContain('<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com/zh/about">')
    expect(extractJsonLd(enHtml).map((b) => b['@type'])).toEqual(
      expect.arrayContaining(['AboutPage', 'Organization', 'BreadcrumbList']),
    )

    const zhRes = await handlePublicSiteRequest(
      new Request('https://citeduo.com/zh/about'),
      new URL('https://citeduo.com/zh/about'),
    )
    expect(zhRes!.status).toBe(200)
    const zhHtml = await zhRes!.text()
    expect(zhHtml).toContain('<h1>CiteDuo 是什么，以及它不是什么</h1>')
    expect(zhHtml).toContain('<link rel="canonical" href="https://citeduo.com/zh/about">')

    const bare = await handlePublicSiteRequest(
      new Request('https://citeduo.com/about/?utm_source=test'),
      new URL('https://citeduo.com/about/?utm_source=test'),
    )
    expect(bare!.status).toBe(301)
    expect(bare!.headers.get('location')).toBe('/about?utm_source=test')
  })

  test('renders bilingual category hubs, item lists, and bare-hub redirects', async () => {
    for (const category of ['guides', 'compare', 'docs'] as const) {
      for (const locale of ['en', 'zh'] as const) {
        const path = categoryPath(category, locale)
        const res = await handlePublicSiteRequest(
          new Request(`https://citeduo.com${path}`),
          new URL(`https://citeduo.com${path}`),
        )
        expect(res!.status).toBe(200)
        const html = await res!.text()
        expect(html).toContain(`<link rel="canonical" href="https://citeduo.com${path}">`)
        expect(extractJsonLd(html).map((b) => b['@type'])).toEqual(
          expect.arrayContaining(['CollectionPage', 'BreadcrumbList']),
        )
        for (const article of SITE_ARTICLES.filter((item) => item.category === category)) {
          expect(html).toContain(`href="${articlePath(article, locale)}"`)
        }
      }
    }

    const bare = await handlePublicSiteRequest(
      new Request('https://citeduo.com/guides?utm_source=test'),
      new URL('https://citeduo.com/guides?utm_source=test'),
    )
    expect(bare!.status).toBe(301)
    expect(bare!.headers.get('location')).toBe('/guides/?utm_source=test')
  })

  test('serves llms.txt with canonical facts, key pages, and honest limitations', async () => {
    const res = await handlePublicSiteRequest(
      new Request('https://citeduo.com/llms.txt'),
      new URL('https://citeduo.com/llms.txt'),
    )
    expect(res!.status).toBe(200)
    expect(res!.headers.get('content-type')).toContain('text/plain')
    const text = await res!.text()
    expect(text).toContain('# CiteDuo')
    expect(text).toContain('https://citeduo.com/about')
    expect(text).toContain(SITE_FACTS.githubRepoUrl)
    expect(text).toContain('MIT')
    expect(text).toContain('not a PRISMA screening tool')
    expect(text).toContain('https://citeduo.com/guides/')
  })

  test('renders all 7 bilingual launch articles (14 URLs) with unique titles, reciprocal hreflang, and valid JSON-LD', async () => {
    expect(SITE_ARTICLES).toHaveLength(7)
    const titles = new Set<string>()

    for (const article of SITE_ARTICLES) {
      const enPath = articlePath(article, 'en')
      const zhPath = articlePath(article, 'zh')

      const enRes = await handlePublicSiteRequest(
        new Request(`https://citeduo.com${enPath}`),
        new URL(`https://citeduo.com${enPath}`),
      )
      const zhRes = await handlePublicSiteRequest(
        new Request(`https://citeduo.com${zhPath}`),
        new URL(`https://citeduo.com${zhPath}`),
      )
      expect(enRes!.status).toBe(200)
      expect(zhRes!.status).toBe(200)

      const enHtml = await enRes!.text()
      const zhHtml = await zhRes!.text()

      expect(titles.has(article.en.metaTitle)).toBe(false)
      expect(titles.has(article.zh.metaTitle)).toBe(false)
      titles.add(article.en.metaTitle)
      titles.add(article.zh.metaTitle)

      expect(enHtml).toContain(`<link rel="canonical" href="https://citeduo.com${enPath}">`)
      expect(enHtml).toContain(`<link rel="alternate" hreflang="en" href="https://citeduo.com${enPath}">`)
      expect(enHtml).toContain(`<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com${zhPath}">`)

      expect(zhHtml).toContain(`<link rel="canonical" href="https://citeduo.com${zhPath}">`)
      expect(zhHtml).toContain(`<link rel="alternate" hreflang="en" href="https://citeduo.com${enPath}">`)
      expect(zhHtml).toContain(`<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com${zhPath}">`)

      expect(extractJsonLd(enHtml).map((b) => b['@type'])).toEqual(
        expect.arrayContaining(['Article', 'BreadcrumbList']),
      )
      expect(extractJsonLd(zhHtml).map((b) => b['@type'])).toEqual(
        expect.arrayContaining(['Article', 'BreadcrumbList']),
      )
    }
  })

  test('articles expose FAQ/HowTo schema, article images, author identity, and topical related links', async () => {
    for (const article of SITE_ARTICLES) {
      for (const locale of ['en', 'zh'] as const) {
        const path = articlePath(article, locale)
        const res = await handlePublicSiteRequest(
          new Request(`https://citeduo.com${path}`),
          new URL(`https://citeduo.com${path}`),
        )
        expect(res!.status).toBe(200)
        const html = await res!.text()
        const types = extractJsonLd(html).map((block) => block['@type'])
        expect(types).toContain('Article')

        const articleSchema = extractJsonLd(html).find((block) => block['@type'] === 'Article')!
        expect(Array.isArray(articleSchema.image)).toBe(true)
        expect(articleSchema.datePublished).toBe(article.publishedAt)
        expect(articleSchema.dateModified).toBe(article.updatedAt)
        expect((articleSchema.author as Record<string, unknown>).sameAs).toEqual(
          expect.arrayContaining([SITE_FACTS.githubRepoUrl]),
        )

        const copy = article[locale]
        if (copy.faq?.length) {
          expect(types).toContain('FAQPage')
          expect(html).toContain(`<summary>${copy.faq[0].question}</summary>`)
        }
        if (copy.howTo?.steps.length) {
          expect(types).toContain('HowTo')
          expect(html).toContain('id="step-1"')
        }

        for (const relatedId of article.relatedIds) {
          const related = SITE_ARTICLES.find((item) => item.id === relatedId)
          expect(related).toBeDefined()
          expect(html).toContain(`href="${articlePath(related!, locale)}"`)
        }
      }
    }
  })

  test('keeps titles and descriptions within search-result-friendly lengths', () => {
    expect(HOME_COPY.en.metaTitle.length).toBeLessThanOrEqual(60)
    expect(HOME_COPY.en.description.length).toBeLessThanOrEqual(160)
    expect(HOME_COPY.zh.metaTitle.length).toBeLessThanOrEqual(60)
    expect(HOME_COPY.zh.description.length).toBeLessThanOrEqual(120)
    for (const article of SITE_ARTICLES) {
      expect(article.en.metaTitle.length).toBeLessThanOrEqual(60)
      expect(article.en.description.length).toBeLessThanOrEqual(160)
      expect(article.zh.metaTitle.length).toBeLessThanOrEqual(60)
      expect(article.zh.description.length).toBeLessThanOrEqual(120)
    }
  })

  test('serves robots.txt and clean sitemaps without app shell, query states, or admin endpoints', async () => {
    const robotsRes = await handlePublicSiteRequest(
      new Request('https://citeduo.com/robots.txt'),
      new URL('https://citeduo.com/robots.txt'),
    )
    expect(robotsRes!.status).toBe(200)
    expect(robotsRes!.headers.get('content-type')).toContain('text/plain')
    const robots = await robotsRes!.text()
    expect(robots).toContain('Sitemap: https://citeduo.com/sitemap.xml')

    const indexRes = await handlePublicSiteRequest(
      new Request('https://citeduo.com/sitemap.xml'),
      new URL('https://citeduo.com/sitemap.xml'),
    )
    expect(indexRes!.status).toBe(200)
    const indexXml = await indexRes!.text()
    expect(indexXml).toContain('https://citeduo.com/sitemap-en.xml')
    expect(indexXml).toContain('https://citeduo.com/sitemap-zh.xml')

    const enXml = await (
      await handlePublicSiteRequest(
        new Request('https://citeduo.com/sitemap-en.xml'),
        new URL('https://citeduo.com/sitemap-en.xml'),
      )
    )!.text()
    const zhXml = await (
      await handlePublicSiteRequest(
        new Request('https://citeduo.com/sitemap-zh.xml'),
        new URL('https://citeduo.com/sitemap-zh.xml'),
      )
    )!.text()

    expect(enXml).toContain('<loc>https://citeduo.com/</loc>')
    expect(zhXml).toContain('<loc>https://citeduo.com/zh/</loc>')
    expect(enXml).toContain('<loc>https://citeduo.com/about</loc>')
    expect(zhXml).toContain('<loc>https://citeduo.com/zh/about</loc>')
    for (const category of ['guides', 'compare', 'docs']) {
      expect(enXml).toContain(`<loc>https://citeduo.com/${category}/</loc>`)
      expect(zhXml).toContain(`<loc>https://citeduo.com/zh/${category}/</loc>`)
    }
    for (const xml of [enXml, zhXml]) {
      expect(xml).not.toContain('/papers/')
      expect(xml).not.toContain('?from=')
      expect(xml).not.toContain('/stats')
      expect(xml).not.toContain('/api/')
    }
  })

  test('serves social preview image and returns explicit 404 with noindex for unknown paths', async () => {
    const imgRes = await handlePublicSiteRequest(
      new Request(`https://citeduo.com${SITE_FACTS.socialImagePath}`),
      new URL(`https://citeduo.com${SITE_FACTS.socialImagePath}`),
    )
    expect(imgRes!.status).toBe(200)

    const notFound = await handlePublicSiteRequest(
      new Request('https://citeduo.com/site/definitely-not-found'),
      new URL('https://citeduo.com/site/definitely-not-found'),
    )
    expect(notFound!.status).toBe(404)
    const html404 = await notFound!.text()
    expect(html404).toContain('noindex,follow')

    const zhNotFound = await handlePublicSiteRequest(
      new Request('https://citeduo.com/zh/guides/missing-guide'),
      new URL('https://citeduo.com/zh/guides/missing-guide'),
    )
    expect(zhNotFound!.status).toBe(404)
  })

  test('records privacy-safe conversion events and drops raw search terms, tokens, and unknown events', () => {
    const db = openDb(':memory:')
    const req = new Request('http://localhost/api/analytics/event', {
      method: 'POST',
      headers: { 'user-agent': 'Mozilla/5.0 Chrome/155' },
    })
    ensureUsageContext(req, { secure: false })

    expect(recordClientEvent(req, { event: 'unknown_hack_event' }, db)).toBe(false)

    const ok = recordClientEvent(
      req,
      {
        event: 'star_cta_click',
        path: '/papers/?from=2304.02643&to=2410.24164&token=supersecret',
        referrer: 'https://citeduo.com/zh/?token=supersecret',
        meta: {
          placement: 'connection_panel',
          valueVerified: true,
          secretQuery: 'my private paper query',
        },
      },
      db,
    )
    expect(ok).toBe(true)

    const row = db
      .query('select event, path, query, referrer, meta from usage_events order by id desc limit 1')
      .get() as { event: string; path: string; query: string | null; referrer: string; meta: string }
    expect(row.event).toBe('star_cta_click')
    expect(row.path).toBe('/papers/')
    expect(row.query).toBeNull()
    expect(row.referrer).toBe('https://citeduo.com/zh/')
    expect(JSON.parse(row.meta)).toEqual({
      placement: 'connection_panel',
      valueVerified: true,
    })
    expect(JSON.stringify(row)).not.toContain('supersecret')
    expect(JSON.stringify(row)).not.toContain('my private paper query')
  })
})
