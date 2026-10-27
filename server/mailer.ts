import nodemailer from 'nodemailer'
import { config } from './config'

export interface MailMessage {
  to: string
  subject: string
  text: string
}

/**
 * Minimal SMTP sender for the one-a-day quota alert. QQ Mail requires an
 * "authorization code" (not the login password), normally on smtp.qq.com:465
 * with implicit TLS. Keeping this behind the env config means the alert can be
 * replaced with any SMTP provider without touching the quota logic.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const { host, port, secure, user, pass, from } = config.mail
  if (!host || !user || !pass || !from) {
    throw new Error('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  })

  try {
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    })
  } finally {
    transporter.close()
  }
}
