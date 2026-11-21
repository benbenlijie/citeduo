import { ABOUT_COPY } from './content/about'
import { articlePath, SITE_ARTICLES } from './content/articles'
import { CATEGORY_COPY, categoryPath } from './content/categories'
import { HOME_COPY } from './content/home'
import { buildAppHomeUrl, buildAppPairUrl, buildGithubOutboundUrl, SITE_FACTS, type SiteLocale } from './facts'
import type { ArticleCategory, FaqItem, HowToSpec, ResolvedPageMeta, SiteArticleSpec } from './types'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function absoluteSiteUrl(pathname: string): string {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${SITE_FACTS.canonicalOrigin}${clean}`
}

function organizationJsonLd(description: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteSiteUrl('/about#organization'),
    name: SITE_FACTS.brandName,
    url: absoluteSiteUrl('/about'),
    sameAs: [SITE_FACTS.githubRepoUrl, SITE_FACTS.maintainerUrl],
    description,
  }
}

function faqJsonLd(faq: FaqItem[] | undefined): Record<string, unknown> | null {
  if (!faq?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

function howToJsonLd(howTo: HowToSpec | undefined, canonicalPath: string): Record<string, unknown> | null {
  if (!howTo?.steps.length) return null
  const pageUrl = absoluteSiteUrl(canonicalPath)
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    step: howTo.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      url: `${pageUrl}#step-${index + 1}`,
    })),
  }
}

function renderFaqSection(faq: FaqItem[] | undefined, locale: SiteLocale): string {
  if (!faq?.length) return ''
  const isZh = locale === 'zh'
  return `<section class="article-sec faq" id="faq">
    <h2>${isZh ? '常见问题' : 'Frequently asked questions'}</h2>
    <div class="faq-list">
      ${faq
        .map(
          (item) =>
            `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`,
        )
        .join('\n')}
    </div>
  </section>`
}

function renderHowToSection(howTo: HowToSpec | undefined, locale: SiteLocale): string {
  if (!howTo?.steps.length) return ''
  const isZh = locale === 'zh'
  return `<section class="article-sec" id="step-by-step">
    <h2>${escapeHtml(howTo.name)}</h2>
    <ol class="howto-list">
      ${howTo.steps
        .map(
          (step, index) =>
            `<li id="step-${index + 1}"><strong>${escapeHtml(step.name)}</strong><p>${escapeHtml(step.text)}</p></li>`,
        )
        .join('\n')}
    </ol>
    <p class="sub">${isZh ? '步骤与页面下方 FAQ、正文证据表一致；先按顺序核查，再回到原文确认语境。' : 'These steps match the evidence table and FAQ below. Verify the source paragraph before making a claim.'}</p>
  </section>`
}

const SITE_CSS = `
:root{--bg:#070c16;--panel:#0f172a;--panel2:#111c33;--line:#1e293b;--text:#e5e7eb;--muted:#94a3b8;--accent:#34d399;--accent-bg:rgba(52,211,153,.13);--blue:#60a5fa;--amber:#fbbf24}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:radial-gradient(1080px 520px at 16% -10%,#102c44 0%,transparent 60%),var(--bg);color:var(--text);font:1rem/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;min-height:100vh}
a{color:#7dd3fc;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{width:100%;max-width:70rem;margin:0 auto;padding:0 1rem}
.site-header{border-bottom:1px solid var(--line);background:rgba(7,12,22,.92);backdrop-filter:blur(10px);position:sticky;top:0;z-index:20}
.nav{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.5rem 0;position:relative}
.brand{display:inline-flex;align-items:center;gap:.6rem;min-height:2.75rem;font-weight:700;font-size:1.15rem;color:#fff;letter-spacing:-.02em}
.brand:hover{text-decoration:none}
.badge-dot{width:.625rem;height:.625rem;border-radius:99px;background:linear-gradient(135deg,var(--accent),var(--blue))}
.nav-links{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;font-size:.875rem}
.nav-links a{display:inline-flex;align-items:center;min-height:2.75rem;color:var(--muted)}
.nav-links a:hover,.nav-links a.active{color:#fff;text-decoration:none}
.mobile-menu{display:block;position:relative;margin-left:auto}
.mobile-menu summary{display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;padding:0 .9rem;border:1px solid var(--line);border-radius:.55rem;background:var(--panel2);color:#fff;font-weight:600;cursor:pointer;list-style:none}
.mobile-menu summary::-webkit-details-marker{display:none}
.mobile-menu[open] summary{border-color:#3b82f6}
.mobile-menu:not([open]) .mobile-nav{display:none}
.mobile-nav{position:fixed;top:4.25rem;left:1rem;right:1rem;width:auto;display:flex;flex-direction:column;gap:.125rem;padding:.5rem;background:var(--panel);border:1px solid var(--line);border-radius:.75rem;box-shadow:0 18px 40px rgba(0,0,0,.45);z-index:30}
.mobile-nav a{display:flex;align-items:center;min-height:2.75rem;padding:0 .75rem;border-radius:.45rem;color:var(--text)}
.mobile-nav a:hover{background:var(--panel2);text-decoration:none}
.mobile-nav .btn{margin-top:.35rem;justify-content:center}
.desktop-nav{display:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:2.75rem;border-radius:.65rem;padding:.65rem 1rem;font-weight:600;font-size:.875rem;border:1px solid var(--line);background:var(--panel2);color:#fff;text-decoration:none;transition:border-color .15s,background .15s}
.btn:hover{border-color:#3b82f6;background:#162544;text-decoration:none}
.btn.primary{background:#059669;border-color:#10b981;color:#fff}
.btn.primary:hover{background:#10b981}
.btn.sm{min-height:2.75rem;padding:.5rem .75rem;font-size:.8125rem;border-radius:.5rem}
.hero{padding:2.5rem 0 1.75rem}
.eyebrow{display:inline-block;font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);background:var(--accent-bg);border:1px solid rgba(52,211,153,.3);border-radius:999px;padding:.25rem .7rem;margin-bottom:1rem}
h1{font-size:clamp(1.9rem,8vw,3rem);line-height:1.14;letter-spacing:-.03em;margin:0 0 1.1rem;color:#fff;max-width:55rem}
.lead{font-size:1.05rem;color:#cbd5e1;max-width:51rem;margin:0 0 1.6rem}
.cta-row{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center}
.cta-row .btn{flex:1 1 100%}
section{padding:1.75rem 0}
h2{font-size:clamp(1.3rem,4vw,1.5rem);line-height:1.28;letter-spacing:-.02em;color:#fff;margin:0 0 .65rem}
h3{font-size:1.05rem;line-height:1.35;color:#f8fafc;margin:0 0 .5rem}
.sub{color:var(--muted);margin:0 0 1.25rem;max-width:48rem;font-size:.9375rem}
.grid-2,.grid-3,.category-grid{display:grid;grid-template-columns:1fr;gap:1rem}
.card{background:linear-gradient(180deg,rgba(17,28,51,.88),rgba(15,23,42,.92));border:1px solid var(--line);border-radius:.9rem;padding:1rem;display:flex;flex-direction:column;justify-content:space-between;gap:.75rem;min-width:0}
.card p{margin:0;color:#cbd5e1;font-size:.9rem}
.pair-endpoints{font-size:.875rem;color:#93c5fd;background:rgba(15,23,42,.8);border:1px solid rgba(59,130,246,.22);border-radius:.55rem;padding:.6rem .7rem;line-height:1.45;overflow-wrap:anywhere}
.shot{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:.9rem;overflow:hidden}
.shot img{display:block;width:100%;height:auto}
.shot figcaption{padding:.7rem .9rem;font-size:.875rem;color:var(--muted);border-top:1px solid var(--line)}
.list-box{background:var(--panel);border:1px solid var(--line);border-radius:.9rem;padding:1rem}
.list-box ul{margin:.6rem 0 0;padding-left:1.25rem;color:#cbd5e1}
.list-box li{margin-bottom:.5rem;font-size:.9375rem}
.star-banner{background:linear-gradient(135deg,rgba(5,150,105,.18),rgba(30,58,138,.28));border:1px solid rgba(52,211,153,.35);border-radius:1rem;padding:1.25rem;margin:1.25rem 0}
.article-shell{max-width:52.5rem;margin:0 auto;padding:1.75rem 0 2rem}
.answer-box{background:rgba(16,185,129,.09);border-left:4px solid var(--accent);border-radius:.65rem;padding:1rem 1.1rem;margin:1.4rem 0 1.75rem;color:#ecfdf5;font-size:1rem;overflow-wrap:anywhere}
.meta-line{font-size:.875rem;color:var(--muted);margin-bottom:1.1rem}
.article-sec{margin:2rem 0}
section[id],li[id]{scroll-margin-top:5rem}
.article-sec p{color:#cbd5e1;margin:0 0 .9rem}
.article-sec ul{padding-left:1.35rem;color:#cbd5e1}
.article-sec li{margin-bottom:.55rem}
.table-wrap{overflow-x:auto;margin:1rem 0;border:1px solid var(--line);border-radius:.75rem;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;background:var(--panel);font-size:.875rem}
th,td{text-align:left;padding:.7rem .8rem;border-bottom:1px solid var(--line);vertical-align:top}
th{color:#f8fafc;background:rgba(17,28,51,.9);font-weight:600}
tr:last-child td{border-bottom:0}
pre{background:#050811;border:1px solid var(--line);border-radius:.7rem;padding:.9rem 1rem;overflow-x:auto;color:#e2e8f0;font-size:.8125rem;line-height:1.55;-webkit-overflow-scrolling:touch}
.breadcrumbs{font-size:.875rem;color:var(--muted);margin-bottom:.9rem}
.breadcrumbs a,.card-title,.card-link{display:inline-flex;align-items:center;min-height:2.75rem}
.breadcrumbs a{justify-content:center;min-width:2.75rem}
.card-title{width:100%}
.faq-list{display:grid;gap:.625rem}
.faq-list details{background:var(--panel);border:1px solid var(--line);border-radius:.7rem;padding:.875rem 1rem}
.faq-list summary{display:flex;align-items:center;min-height:2.75rem;cursor:pointer;color:#f8fafc;font-weight:600}
.faq-list p{margin:.6rem 0 0;color:#cbd5e1}
.howto-list{padding-left:1.5rem;color:#cbd5e1}
.howto-list li{margin-bottom:1rem}
.howto-list strong{color:#f8fafc}
.howto-list p{margin:.25rem 0 0}
.site-footer{border-top:1px solid var(--line);padding:2rem 0 3rem;margin-top:2.25rem;color:var(--muted);font-size:.875rem}
.site-footer a{display:inline-flex;align-items:center;min-height:2.75rem}
.footer-grid{display:flex;flex-direction:column;gap:1rem}
.footer-grid .nav-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(8.75rem,1fr));gap:0 1rem;width:100%}
.footer-grid .nav-links a{display:flex;align-items:center;justify-content:center;min-width:2.75rem;min-height:2.75rem;border-bottom:1px solid var(--line)}
.footer-grid .nav-links a:last-child{border-bottom:0}
@media(max-width:39.9375rem){
  .table-wrap{overflow:visible;border:0}
  .table-wrap table,.table-wrap tbody,.table-wrap tr,.table-wrap td{display:block;width:100%}
  .table-wrap thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .table-wrap tr{background:var(--panel);border:1px solid var(--line);border-radius:.75rem;margin-bottom:.75rem;padding:.35rem 0}
  .table-wrap td{border:0;padding:.45rem .85rem}
  .table-wrap td::before{content:attr(data-label);display:block;color:var(--muted);font-size:.75rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.15rem}
}
@media(min-width:40rem){
  .wrap{padding:0 1.375rem}
  .hero{padding:3.5rem 0 2.5rem}
  .cta-row .btn{flex:0 1 auto}
  .grid-2,.grid-3,.category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .footer-grid{flex-direction:row;justify-content:space-between;align-items:flex-start}
  .footer-grid .nav-links{width:auto;display:flex;flex-wrap:wrap;gap:1rem}
  .footer-grid .nav-links a{min-height:2.75rem;border-bottom:0;padding:0}
  .article-shell{padding:2.25rem 0}
}
@media(min-width:48rem){
  .mobile-menu{display:none}
  .desktop-nav{display:flex}
  .nav{flex-wrap:nowrap}
  .hero{padding:4rem 0 2.625rem}
  .grid-3,.category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .article-shell{padding:2.75rem 0 2.25rem}
}
@media(min-width:64rem){
  .grid-3,.category-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`

function clientBeaconScript(pageEvent: 'landing_view' | 'page_view', locale: SiteLocale): string {
  return `<script>
(function(){
  // 营销页可挂在 /papers/ 子路径下；根绝对路径会打到主站而不是本服务。
  var apiBase = (location.pathname === '/papers' || location.pathname.indexOf('/papers/') === 0) ? '/papers' : '';
  if (apiBase) {
    var icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.setAttribute('href', apiBase + '/site-assets/favicon.svg');
  }
  function send(ev, meta){
    try{
      var payload = JSON.stringify({ event: ev, path: location.pathname, referrer: document.referrer || '', meta: Object.assign({ locale: '${locale}' }, meta || {}) });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(apiBase + '/api/analytics/event', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(apiBase + '/api/analytics/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true, credentials: 'same-origin' }).catch(function(){});
      }
    }catch(_){}
  }
  if (${JSON.stringify(pageEvent)} === 'landing_view') send('landing_view');
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('[data-track]') : null;
    if (!el) return;
    var kind = el.getAttribute('data-track');
    var placement = el.getAttribute('data-placement') || 'unknown';
    if (kind === 'example_open') {
      send('example_open', { pair: el.getAttribute('data-pair') || '', placement: placement });
    } else if (kind === 'star_cta_click') {
      send('star_cta_click', { placement: placement });
      send('github_outbound', { placement: placement });
    } else if (kind === 'github_outbound') {
      send('github_outbound', { placement: placement });
    }
  });
  var starEl = document.querySelector('[data-observe-star]');
  if (starEl && 'IntersectionObserver' in window) {
    var seen = false;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!seen && entry.isIntersecting) {
          seen = true;
          send('star_cta_view', { placement: starEl.getAttribute('data-observe-star') || 'banner' });
          io.disconnect();
        }
      });
    }, { threshold: 0.35 });
    io.observe(starEl);
  }
})();
</script>`
}

function renderHead(meta: ResolvedPageMeta, jsonLdBlocks: Record<string, unknown>[], extraMeta = ''): string {
  const canonicalUrl = absoluteSiteUrl(meta.canonicalPath)
  const enUrl = absoluteSiteUrl(meta.enPath)
  const zhUrl = absoluteSiteUrl(meta.zhPath)
  const socialImg = absoluteSiteUrl(SITE_FACTS.socialImagePath)
  const jsonLdHtml = jsonLdBlocks
    .map((block) => `<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`)
    .join('\n')

  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/site-assets/favicon.svg" type="image/svg+xml">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<link rel="alternate" hreflang="en" href="${escapeHtml(enUrl)}">
<link rel="alternate" hreflang="zh-Hans" href="${escapeHtml(zhUrl)}">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(enUrl)}">
<meta property="og:type" content="${meta.ogType}">
<meta property="og:site_name" content="${escapeHtml(SITE_FACTS.brandName)}">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:image" content="${escapeHtml(socialImg)}">
<meta property="og:image:width" content="${SITE_FACTS.socialImageWidth}">
<meta property="og:image:height" content="${SITE_FACTS.socialImageHeight}">
${meta.ogType === 'article' && meta.publishedAt ? `<meta property="article:published_time" content="${escapeHtml(meta.publishedAt)}">` : ''}
${meta.ogType === 'article' ? `<meta property="article:modified_time" content="${escapeHtml(meta.updatedAt)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${escapeHtml(socialImg)}">
${extraMeta}
<style>${SITE_CSS}</style>
${jsonLdHtml}
</head>`
}

function renderHeader(meta: ResolvedPageMeta): string {
  const isZh = meta.locale === 'zh'
  const homeHref = isZh ? '/zh/' : '/'
  const guidesHref = categoryPath('guides', meta.locale)
  const compareHref = categoryPath('compare', meta.locale)
  const selfHostHref = isZh ? '/zh/docs/self-hosting-citeduo' : '/docs/self-hosting-citeduo'
  const switchHref = isZh ? meta.enPath : meta.zhPath
  const switchLabel = isZh ? 'English' : '简体中文'
  const appHref = buildAppHomeUrl(isZh ? 'header_zh' : 'header_en')
  const githubHref = buildGithubOutboundUrl('header', meta.locale)
  const primaryLinks = `
      <a href="${escapeHtml(guidesHref)}">${isZh ? '方法指南' : 'Guides'}</a>
      <a href="${escapeHtml(compareHref)}">${isZh ? '工具对比' : 'Compare'}</a>
      <a href="${escapeHtml(selfHostHref)}">${isZh ? '自托管部署' : 'Self-Hosting'}</a>
      <a href="${escapeHtml(appHref)}">${isZh ? '论文工作台' : 'Workspace'}</a>
      <a href="${escapeHtml(githubHref)}" target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="header">GitHub</a>`
  const switchLink = `<a class="btn sm" href="${escapeHtml(switchHref)}" hreflang="${isZh ? 'en' : 'zh-Hans'}">${switchLabel}</a>`

  return `<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="${escapeHtml(homeHref)}">
      <span class="badge-dot" aria-hidden="true"></span>
      <span>${escapeHtml(SITE_FACTS.brandName)}</span>
    </a>
    <details class="mobile-menu">
      <summary aria-label="${isZh ? '打开导航菜单' : 'Open navigation menu'}">${isZh ? '菜单' : 'Menu'}</summary>
      <nav class="mobile-nav" aria-label="${isZh ? '移动端导航' : 'Mobile navigation'}">
        ${primaryLinks}
        ${switchLink}
      </nav>
    </details>
    <nav class="nav-links desktop-nav" aria-label="${isZh ? '主导航' : 'Primary'}">
      ${primaryLinks}
      ${switchLink}
    </nav>
  </div>
</header>`
}

function renderFooter(locale: SiteLocale): string {
  const isZh = locale === 'zh'
  const homeHref = isZh ? '/zh/' : '/'
  const aboutHref = isZh ? '/zh/about' : '/about'
  const guidesHref = categoryPath('guides', locale)
  const compareHref = categoryPath('compare', locale)
  const docsHref = categoryPath('docs', locale)
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <strong>${escapeHtml(SITE_FACTS.brandName)}</strong> · ${
        isZh
          ? `本地优先开源学术论文关系探索器（${SITE_FACTS.licenseSpdx} 许可证）`
          : `Open-source, local-first academic paper relation explorer (${SITE_FACTS.licenseSpdx} License)`
      }<br>
      <span>${isZh ? '最后更新' : 'Last updated'}: ${SITE_FACTS.lastUpdated} · <a href="${escapeHtml(aboutHref)}">${escapeHtml(SITE_FACTS.maintainer)}</a></span>
    </div>
    <div class="nav-links">
      <a href="${escapeHtml(homeHref)}">${isZh ? '首页' : 'Home'}</a>
      <a href="${escapeHtml(guidesHref)}">${isZh ? '指南' : 'Guides'}</a>
      <a href="${escapeHtml(compareHref)}">${isZh ? '对比' : 'Compare'}</a>
      <a href="${escapeHtml(docsHref)}">${isZh ? '文档' : 'Docs'}</a>
      <a href="${escapeHtml(aboutHref)}">${isZh ? '关于' : 'About'}</a>
      <a href="${escapeHtml(buildAppHomeUrl(isZh ? 'footer_zh' : 'footer_en'))}">${isZh ? '进入应用 (/papers/)' : 'Open App (/papers/)'}</a>
      <a href="/sitemap.xml">Sitemap</a>
      <a href="${escapeHtml(buildGithubOutboundUrl('footer', locale))}" target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="footer">GitHub (${SITE_FACTS.licenseSpdx})</a>
    </div>
  </div>
</footer>`
}

export function renderLandingPage(locale: SiteLocale): string {
  const copy = HOME_COPY[locale]
  const isZh = locale === 'zh'
  const canonicalPath = isZh ? '/zh/' : '/'
  const meta: ResolvedPageMeta = {
    locale,
    htmlLang: isZh ? 'zh-CN' : 'en',
    hreflangSelf: isZh ? 'zh-Hans' : 'en',
    title: copy.metaTitle,
    description: copy.description,
    canonicalPath,
    enPath: '/',
    zhPath: '/zh/',
    updatedAt: SITE_FACTS.lastUpdated,
    ogType: 'website',
  }

  const primaryPair = SITE_FACTS.examplePairs[0]
  const primaryPairHref = buildAppPairUrl(primaryPair)
  const heroStarHref = buildGithubOutboundUrl('hero', locale)
  const bannerStarHref = buildGithubOutboundUrl('value_banner', locale)
  const selfHostHref = isZh ? '/zh/docs/self-hosting-citeduo' : '/docs/self-hosting-citeduo'

  const jsonLd: Record<string, unknown>[] = [
    organizationJsonLd(copy.description),
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_FACTS.brandName,
      url: absoluteSiteUrl(canonicalPath),
      inLanguage: meta.htmlLang,
      description: copy.description,
      publisher: { '@id': absoluteSiteUrl('/about#organization') },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_FACTS.brandName,
      applicationCategory: 'ReferenceApplication',
      operatingSystem: 'Linux, macOS, Windows, Docker, Web',
      url: absoluteSiteUrl(canonicalPath),
      codeRepository: SITE_FACTS.githubRepoUrl,
      license: SITE_FACTS.licenseUrl,
      sameAs: [SITE_FACTS.githubRepoUrl, SITE_FACTS.maintainerUrl],
      screenshot: absoluteSiteUrl(SITE_FACTS.socialImagePath),
      featureList: SITE_FACTS.featureList,
      applicationSubCategory: 'Literature discovery and citation analysis',
      inLanguage: ['en', 'zh-Hans'],
      description: copy.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ]
  const homeFaqJsonLd = faqJsonLd(copy.faq)
  if (homeFaqJsonLd) jsonLd.push(homeFaqJsonLd)

  const examplesHtml = SITE_FACTS.examplePairs
    .map((pair) => {
      const href = buildAppPairUrl(pair)
      return `<article class="card">
        <div>
          <h3>${escapeHtml(pair.title[locale])}</h3>
          <div class="pair-endpoints">
            <div><strong>A:</strong> ${escapeHtml(pair.fromTitle)}</div>
            <div><strong>B:</strong> ${escapeHtml(pair.toTitle)}</div>
          </div>
          <p style="margin-top:10px">${escapeHtml(pair.bridgeSummary[locale])}</p>
        </div>
        <div>
          <a class="btn primary sm" href="${escapeHtml(href)}" data-track="example_open" data-pair="${escapeHtml(pair.id)}" data-placement="examples_grid">${escapeHtml(copy.tryPairLabel)}</a>
        </div>
      </article>`
    })
    .join('\n')

  const stepsHtml = copy.steps
    .map(
      (step) => `<div class="card">
      <div>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.body)}</p>
      </div>
    </div>`,
    )
    .join('\n')

  const visualsHtml = copy.visuals
    .map(
      (v) => `<figure class="shot">
      <img src="${escapeHtml(v.src)}"${v.srcSet ? ` srcset="${escapeHtml(v.srcSet)}" sizes="${escapeHtml(v.sizes ?? '100vw')}"` : ''} alt="${escapeHtml(v.alt)}" width="${v.width}" height="${v.height}" loading="lazy" decoding="async">
      <figcaption>${escapeHtml(v.caption)}</figcaption>
    </figure>`,
    )
    .join('\n')

  const diffsHtml = copy.diffs
    .map(
      (d) => `<div class="card">
      <div>
        <h3>${escapeHtml(d.title)}</h3>
        <p>${escapeHtml(d.body)}</p>
      </div>
    </div>`,
    )
    .join('\n')

  const faqHtml = renderFaqSection(copy.faq, locale)

  const articlesHtml = SITE_ARTICLES.map((article) => {
    const item = article[locale]
    const href = articlePath(article, locale)
    return `<article class="card">
      <div>
        <span class="eyebrow" style="margin-bottom:10px">${escapeHtml(item.eyebrow)}</span>
        <h3><a class="card-title" href="${escapeHtml(href)}" style="color:#fff">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
      <div>
        <a class="card-link" href="${escapeHtml(href)}">${isZh ? '阅读全文 →' : 'Read guide →'}</a>
      </div>
    </article>`
  }).join('\n')

  return `<!doctype html>
<html lang="${meta.htmlLang}">
${renderHead(meta, jsonLd)}
<body>
${renderHeader(meta)}
<main class="wrap">
  <section class="hero">
    <span class="eyebrow">${escapeHtml(copy.eyebrow)}</span>
    <h1>${escapeHtml(copy.h1)}</h1>
    <p class="lead">${escapeHtml(copy.lead)}</p>
    <div class="cta-row">
      <a class="btn primary" href="${escapeHtml(primaryPairHref)}" data-track="example_open" data-pair="${escapeHtml(primaryPair.id)}" data-placement="hero">${escapeHtml(copy.primaryCta)}</a>
      <a class="btn" href="${escapeHtml(buildAppHomeUrl(isZh ? 'hero_workspace_zh' : 'hero_workspace_en'))}">${escapeHtml(copy.openWorkspaceCta)}</a>
      <a class="btn" href="${escapeHtml(heroStarHref)}" target="_blank" rel="noopener noreferrer" data-track="star_cta_click" data-placement="hero">${escapeHtml(copy.secondaryCta)}</a>
    </div>
  </section>

  <section id="examples">
    <h2>${escapeHtml(copy.examplesHeading)}</h2>
    <p class="sub">${escapeHtml(copy.examplesSub)}</p>
    <div class="grid-3">
      ${examplesHtml}
    </div>
  </section>

  <section id="how-it-works">
    <h2>${escapeHtml(copy.stepsHeading)}</h2>
    <div class="grid-2">
      ${stepsHtml}
    </div>
  </section>

  <section id="screenshots">
    <h2>${escapeHtml(copy.visualHeading)}</h2>
    <p class="sub">${escapeHtml(copy.visualSub)}</p>
    <div class="grid-2">
      ${visualsHtml}
    </div>
  </section>

  <section id="differentiators">
    <h2>${escapeHtml(copy.diffHeading)}</h2>
    <p class="sub">${escapeHtml(copy.diffSub)}</p>
    <div class="grid-2">
      ${diffsHtml}
    </div>
  </section>

  <section id="fit">
    <h2>${escapeHtml(copy.fitHeading)}</h2>
    <div class="grid-2">
      <div class="list-box">
        <h3>${escapeHtml(copy.goodFitTitle)}</h3>
        <ul>${copy.goodFit.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="list-box">
        <h3>${escapeHtml(copy.notFitTitle)}</h3>
        <ul>${copy.notFit.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  <section id="limitations">
    <h2>${escapeHtml(copy.limitsHeading)}</h2>
    <div class="list-box">
      <ul>${copy.limits.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  </section>

  ${faqHtml}

  <section id="guides">
    <h2>${escapeHtml(copy.resourcesHeading)}</h2>
    <p class="sub">${escapeHtml(copy.resourcesSub)}</p>
    <div class="grid-3">
      ${articlesHtml}
    </div>
  </section>

  <section>
    <div class="star-banner" data-observe-star="landing_bottom">
      <h2>${escapeHtml(copy.starBannerHeading)}</h2>
      <p class="sub" style="color:#e2e8f0;margin-bottom:16px">${escapeHtml(copy.starBannerBody)}</p>
      <div class="cta-row">
        <a class="btn primary" href="${escapeHtml(bannerStarHref)}" target="_blank" rel="noopener noreferrer" data-track="star_cta_click" data-placement="landing_bottom">★ ${escapeHtml(copy.starBannerButton)}</a>
        <a class="btn" href="${escapeHtml(selfHostHref)}">${escapeHtml(copy.selfHostButton)}</a>
      </div>
    </div>
  </section>
</main>
${renderFooter(locale)}
${clientBeaconScript('landing_view', locale)}
</body>
</html>`
}

export function renderArticlePage(article: SiteArticleSpec, locale: SiteLocale): string {
  const isZh = locale === 'zh'
  const content = article[locale]
  const enPath = articlePath(article, 'en')
  const zhPath = articlePath(article, 'zh')
  const canonicalPath = isZh ? zhPath : enPath
  const homePath = isZh ? '/zh/' : '/'

  const meta: ResolvedPageMeta = {
    locale,
    htmlLang: isZh ? 'zh-CN' : 'en',
    hreflangSelf: isZh ? 'zh-Hans' : 'en',
    title: content.metaTitle,
    description: content.description,
    canonicalPath,
    enPath,
    zhPath,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    ogType: 'article',
  }

  const categoryLabel =
    article.category === 'guides'
      ? isZh ? '方法指南' : 'Guides'
      : article.category === 'compare'
        ? isZh ? '工具对比' : 'Comparisons'
        : isZh ? '部署文档' : 'Documentation'
  const categoryUrl = absoluteSiteUrl(categoryPath(article.category, locale))

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: content.title,
      description: content.description,
      dateModified: article.updatedAt,
      datePublished: article.publishedAt,
      inLanguage: meta.htmlLang,
      mainEntityOfPage: absoluteSiteUrl(canonicalPath),
      image: [absoluteSiteUrl(SITE_FACTS.socialImagePath)],
      author: {
        '@type': 'Organization',
        name: SITE_FACTS.maintainer,
        url: absoluteSiteUrl(isZh ? '/zh/about' : '/about'),
        sameAs: [SITE_FACTS.maintainerUrl, SITE_FACTS.githubRepoUrl],
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_FACTS.brandName,
        url: absoluteSiteUrl('/about'),
        sameAs: [SITE_FACTS.githubRepoUrl],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: isZh ? 'CiteDuo 首页' : 'CiteDuo Home',
          item: absoluteSiteUrl(homePath),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: categoryLabel,
          item: categoryUrl,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: content.title,
          item: absoluteSiteUrl(canonicalPath),
        },
      ],
    },
  ]
  const howToLd = howToJsonLd(content.howTo, canonicalPath)
  if (howToLd) jsonLd.push(howToLd)
  const faqLd = faqJsonLd(content.faq)
  if (faqLd) jsonLd.push(faqLd)

  const sectionsHtml = content.sections
    .map((sec) => {
      const paragraphs = sec.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
      const bullets = sec.bullets
        ? `<ul>${sec.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
        : ''
      const tableSpec = sec.table
      const table = tableSpec
        ? `<div class="table-wrap"><table><thead><tr>${tableSpec.headers
            .map((h) => `<th>${escapeHtml(h)}</th>`)
            .join('')}</tr></thead><tbody>${tableSpec.rows
            .map(
              (r) =>
                `<tr>${r
                  .map(
                    (c, index) =>
                      `<td data-label="${escapeHtml(tableSpec.headers[index] ?? '')}">${escapeHtml(c)}</td>`,
                  )
                  .join('')}</tr>`,
            )
            .join('')}</tbody></table></div>`
        : ''
      const code = sec.code ? `<pre><code>${escapeHtml(sec.code)}</code></pre>` : ''
      return `<section class="article-sec">
        <h2>${escapeHtml(sec.heading)}</h2>
        ${paragraphs}
        ${bullets}
        ${table}
        ${code}
      </section>`
    })
    .join('\n')

  const articleById = new Map(SITE_ARTICLES.map((item) => [item.id, item]))
  const related = article.relatedIds
    .map((id) => articleById.get(id))
    .filter((item): item is SiteArticleSpec => Boolean(item))
  for (const item of SITE_ARTICLES) {
    if (related.length >= 3) break
    if (item.id !== article.id && !related.includes(item)) related.push(item)
  }
  const relatedHtml = related
    .map((item) => {
      const href = articlePath(item, locale)
      return `<article class="card">
        <div>
          <h3><a href="${escapeHtml(href)}" style="color:#fff">${escapeHtml(item[locale].title)}</a></h3>
          <p>${escapeHtml(item[locale].description)}</p>
        </div>
      </article>`
    })
    .join('\n')

  const howToHtml = renderHowToSection(content.howTo, locale)
  const faqHtml = renderFaqSection(content.faq, locale)
  const starHref = buildGithubOutboundUrl(`article_${article.slug}`, locale)
  const isCtaExternal = content.ctaHref.startsWith('http')
  const isSecondaryExternal = content.secondaryCtaHref?.startsWith('http') ?? false

  return `<!doctype html>
<html lang="${meta.htmlLang}">
${renderHead(meta, jsonLd)}
<body>
${renderHeader(meta)}
<main class="wrap">
  <article class="article-shell">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${escapeHtml(homePath)}">${isZh ? '首页' : 'Home'}</a> /
      <a href="${escapeHtml(`${homePath}#guides`)}">${escapeHtml(categoryLabel)}</a> /
      <span>${escapeHtml(content.title)}</span>
    </nav>
    <span class="eyebrow">${escapeHtml(content.eyebrow)}</span>
    <h1>${escapeHtml(content.title)}</h1>
    <div class="meta-line">
      ${isZh ? '维护者' : 'Maintained by'}: <a href="${escapeHtml(isZh ? '/zh/about' : '/about')}">${escapeHtml(SITE_FACTS.maintainer)}</a> ·
      ${isZh ? '发布' : 'Published'}: <time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(article.publishedAt)}</time> ·
      ${isZh ? '更新' : 'Updated'}: <time datetime="${escapeHtml(article.updatedAt)}">${escapeHtml(article.updatedAt)}</time>
    </div>

    <div class="answer-box">
      <strong>${isZh ? '核心结论：' : 'Short answer: '}</strong>${escapeHtml(content.summaryAnswer)}
    </div>

    <div class="cta-row" style="margin-bottom:28px">
      <a class="btn primary" href="${escapeHtml(content.ctaHref)}"${isCtaExternal ? ' target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="article_top"' : ' data-track="example_open" data-placement="article_top"'}>${escapeHtml(content.ctaLabel)}</a>
      ${
        content.secondaryCtaLabel && content.secondaryCtaHref
          ? `<a class="btn" href="${escapeHtml(content.secondaryCtaHref)}"${isSecondaryExternal ? ' target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="article_top_secondary"' : ''}>${escapeHtml(content.secondaryCtaLabel)}</a>`
          : ''
      }
    </div>

    ${howToHtml}

    ${sectionsHtml}

    ${faqHtml}

    <section class="article-sec">
      <h2>${isZh ? '参考资料与可核验来源' : 'References & Verifiable Sources'}</h2>
      <ul>
        ${content.sources
          .map(
            (s) =>
              `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a></li>`,
          )
          .join('')}
      </ul>
    </section>

    <div class="star-banner" data-observe-star="article_${escapeHtml(article.slug)}">
      <h2>${isZh ? '觉得这篇指南有帮助？' : 'Was this guide useful for your literature workflow?'}</h2>
      <p class="sub" style="color:#e2e8f0;margin-bottom:14px">${
        isZh
          ? '先在工作台用你手头的两篇论文试跑一次关联分析；如果确实帮到了你，欢迎在 GitHub 点亮 Star 支持开源维护。'
          : 'Run a relation check on two papers from your own reading list first — and if CiteDuo saves you time, star the open-source repository on GitHub.'
      }</p>
      <div class="cta-row">
        <a class="btn primary" href="${escapeHtml(starHref)}" target="_blank" rel="noopener noreferrer" data-track="star_cta_click" data-placement="article_${escapeHtml(article.slug)}">★ ${isZh ? '在 GitHub 上点 Star' : 'Star on GitHub'}</a>
        <a class="btn" href="${escapeHtml(buildAppHomeUrl(`article_bottom_${locale}`))}">${isZh ? '打开 CiteDuo 工作台' : 'Open CiteDuo Workspace'}</a>
      </div>
    </div>
  </article>

  <section>
    <h2>${isZh ? '继续阅读相关指南' : 'Related Guides & Comparisons'}</h2>
    <div class="grid-3">
      ${relatedHtml}
    </div>
  </section>
</main>
${renderFooter(locale)}
${clientBeaconScript('page_view', locale)}
</body>
</html>`
}

export function renderCategoryPage(category: ArticleCategory, locale: SiteLocale): string {
  const isZh = locale === 'zh'
  const copy = CATEGORY_COPY[category][locale]
  const enPath = categoryPath(category, 'en')
  const zhPath = categoryPath(category, 'zh')
  const canonicalPath = isZh ? zhPath : enPath
  const homePath = isZh ? '/zh/' : '/'
  const meta: ResolvedPageMeta = {
    locale,
    htmlLang: isZh ? 'zh-CN' : 'en',
    hreflangSelf: isZh ? 'zh-Hans' : 'en',
    title: copy.metaTitle,
    description: copy.description,
    canonicalPath,
    enPath,
    zhPath,
    updatedAt: SITE_FACTS.lastUpdated,
    ogType: 'website',
  }

  const articles = SITE_ARTICLES.filter((article) => article.category === category)
  const cardsHtml = articles
    .map((article) => {
      const item = article[locale]
      const href = articlePath(article, locale)
      return `<article class="card">
        <div>
          <span class="eyebrow" style="margin-bottom:10px">${escapeHtml(item.eyebrow)}</span>
          <h3><a class="card-title" href="${escapeHtml(href)}" style="color:#fff">${escapeHtml(item.title)}</a></h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
        <div><a class="card-link" href="${escapeHtml(href)}">${isZh ? '阅读全文 →' : 'Read more →'}</a></div>
      </article>`
    })
    .join('\n')
  const sectionsHtml = copy.sections
    .map(
      (section) => `<section class="article-sec">
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
      </section>`,
    )
    .join('\n')

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: copy.h1,
      description: copy.description,
      url: absoluteSiteUrl(canonicalPath),
      inLanguage: meta.htmlLang,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: articles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteSiteUrl(articlePath(article, locale)),
          name: article[locale].title,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: isZh ? 'CiteDuo 首页' : 'CiteDuo Home',
          item: absoluteSiteUrl(homePath),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: copy.h1,
          item: absoluteSiteUrl(canonicalPath),
        },
      ],
    },
  ]

  return `<!doctype html>
<html lang="${meta.htmlLang}">
${renderHead(meta, jsonLd)}
<body>
${renderHeader(meta)}
<main class="wrap">
  <section class="article-shell">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${escapeHtml(homePath)}">${isZh ? '首页' : 'Home'}</a> / <span>${escapeHtml(copy.h1)}</span>
    </nav>
    <span class="eyebrow">${escapeHtml(copy.eyebrow)}</span>
    <h1>${escapeHtml(copy.h1)}</h1>
    <p class="lead">${escapeHtml(copy.lead)}</p>
    <div class="cta-row">
      <a class="btn primary" href="${escapeHtml(buildAppHomeUrl(`category_${category}_${locale}`))}">${isZh ? '打开论文工作台' : 'Open paper workspace'}</a>
      <a class="btn" href="${escapeHtml(buildGithubOutboundUrl(`category_${category}`, locale))}" target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="category_${category}">GitHub (${SITE_FACTS.licenseSpdx})</a>
    </div>
    ${sectionsHtml}
  </section>
  <section>
    <div class="category-grid">
      ${cardsHtml}
    </div>
  </section>
</main>
${renderFooter(locale)}
${clientBeaconScript('page_view', locale)}
</body>
</html>`
}

export function renderAboutPage(locale: SiteLocale): string {
  const isZh = locale === 'zh'
  const copy = ABOUT_COPY[locale]
  const enPath = '/about'
  const zhPath = '/zh/about'
  const canonicalPath = isZh ? zhPath : enPath
  const homePath = isZh ? '/zh/' : '/'
  const meta: ResolvedPageMeta = {
    locale,
    htmlLang: isZh ? 'zh-CN' : 'en',
    hreflangSelf: isZh ? 'zh-Hans' : 'en',
    title: copy.metaTitle,
    description: copy.description,
    canonicalPath,
    enPath,
    zhPath,
    updatedAt: SITE_FACTS.lastUpdated,
    ogType: 'website',
  }

  const sectionsHtml = copy.sections
    .map((section) => {
      const bullets = section.bullets
        ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : ''
      return `<section class="article-sec">
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
        ${bullets}
      </section>`
    })
    .join('\n')

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: copy.h1,
      description: copy.description,
      url: absoluteSiteUrl(canonicalPath),
      inLanguage: meta.htmlLang,
      mainEntity: { '@id': absoluteSiteUrl('/about#organization') },
    },
    organizationJsonLd(copy.description),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: isZh ? 'CiteDuo 首页' : 'CiteDuo Home',
          item: absoluteSiteUrl(homePath),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: copy.h1,
          item: absoluteSiteUrl(canonicalPath),
        },
      ],
    },
  ]

  return `<!doctype html>
<html lang="${meta.htmlLang}">
${renderHead(meta, jsonLd)}
<body>
${renderHeader(meta)}
<main class="wrap">
  <article class="article-shell">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${escapeHtml(homePath)}">${isZh ? '首页' : 'Home'}</a> / <span>${isZh ? '关于' : 'About'}</span>
    </nav>
    <span class="eyebrow">${escapeHtml(copy.eyebrow)}</span>
    <h1>${escapeHtml(copy.h1)}</h1>
    <p class="lead">${escapeHtml(copy.lead)}</p>
    <div class="cta-row">
      <a class="btn primary" href="${escapeHtml(buildAppHomeUrl(`about_workspace_${locale}`))}">${escapeHtml(copy.workspaceCta)}</a>
      <a class="btn" href="${escapeHtml(buildGithubOutboundUrl('about', locale))}" target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="about">${escapeHtml(copy.githubCta)}</a>
    </div>
    ${sectionsHtml}
  </article>
</main>
${renderFooter(locale)}
${clientBeaconScript('page_view', locale)}
</body>
</html>`
}

export function renderNotFoundPage(pathname: string): string {
  const isZh = pathname === '/zh' || pathname.startsWith('/zh/')
  const htmlLang = isZh ? 'zh-CN' : 'en'
  const title = isZh ? '404 页面不存在 · CiteDuo' : '404 Page Not Found · CiteDuo'
  const heading = isZh ? '找不到你访问的页面（404）' : 'Page not found (404)'
  const body = isZh
    ? '该地址不存在或已被移动。你可以返回 CiteDuo 首页阅读指南，或直接进入交互式论文关系工作台。'
    : 'This URL does not exist on citeduo.com. Return to the CiteDuo home page or open the interactive paper workspace.'

  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex,follow">
<style>${SITE_CSS}</style>
</head>
<body>
<main class="wrap" style="padding:84px 22px">
  <span class="eyebrow">HTTP 404</span>
  <h1>${escapeHtml(heading)}</h1>
  <p class="lead">${escapeHtml(body)}</p>
  <div class="cta-row">
    <a class="btn primary" href="${isZh ? '/zh/' : '/'}">${isZh ? '返回首页' : 'Back to Home'}</a>
    <a class="btn" href="${escapeHtml(buildAppHomeUrl('404'))}">${isZh ? '打开论文工作台 (/papers/)' : 'Open Workspace (/papers/)'}</a>
  </div>
</main>
</body>
</html>`
}
