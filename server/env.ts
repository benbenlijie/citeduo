function opt(name: string): string | undefined {
  const v = Bun.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export const env = {
  semanticScholarApiKey: opt('SEMANTIC_SCHOLAR_API_KEY'),
  openalexApiKey: opt('OPENALEX_API_KEY'),
  contactEmail: opt('CONTACT_EMAIL') ?? 'researcher@example.com',
  accessToken: opt('ACCESS_TOKEN'),
  /** Optional separate password for /stats; falls back to ACCESS_TOKEN. */
  adminToken: opt('ADMIN_TOKEN'),
  demoPublic: opt('DEMO_PUBLIC') === '1',
  demoAlertWebhook: opt('DEMO_ALERT_WEBHOOK'),
  demoAlertFormat: opt('DEMO_ALERT_FORMAT'),
  internalToken: opt('INTERNAL_TOKEN'),
  basePath: opt('BASE_PATH') ?? '',
  trustProxy: opt('TRUST_PROXY') === '1' || opt('TRUST_PROXY') === 'true',
  port: Number(opt('PORT') ?? 8787),
  hostname: opt('HOST') ?? '127.0.0.1',
}
