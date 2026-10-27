import { getDemoQuotaStatus, resetDemoQuota } from '../demo-quota'
import { sendMail } from '../mailer'
import { config } from '../config'

function noStore(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

/** `GET /api/admin/demo-quota` — current budget state. */
export function demoQuotaRoute(): Response {
  return noStore({ data: getDemoQuotaStatus() })
}

/** `POST /api/admin/demo-quota/reset` — unblock the current day immediately. */
export function demoQuotaResetRoute(): Response {
  return noStore({ data: resetDemoQuota(), reset: true })
}


/** `POST /api/admin/demo-quota/test-email` — verify the SMTP alert path. */
export async function demoQuotaTestEmailRoute(): Promise<Response> {
  const to = config.demo.alertEmail
  if (!to) {
    return noStore({ error: { code: 'EMAIL_NOT_CONFIGURED', message: 'DEMO_ALERT_EMAIL 未配置' } })
  }
  try {
    await sendMail({
      to,
      subject: '[CiteDuo demo] 邮件报警测试',
      text: '这是一封 CiteDuo 公开 demo 的测试邮件。收到它说明每日配额报警邮件通道已经配置成功。',
    })
    return noStore({ data: { sent: true, to } })
  } catch (error) {
    console.warn('[demo-quota] test email failed:', error instanceof Error ? error.message : String(error))
    return new Response(JSON.stringify({
      error: { code: 'EMAIL_FAILED', message: '邮件发送失败，请检查 SMTP 配置' },
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
}
