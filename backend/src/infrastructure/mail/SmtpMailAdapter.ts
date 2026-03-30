// backend/src/infrastructure/mail/SmtpMailAdapter.ts
// SMTP mail adapter using Nodemailer. Only mail implementation in v1.
import nodemailer from 'nodemailer'
import type { IMailAdapter } from '../../domain/interfaces/IMailAdapter.js'
import type { Config } from '../../config.js'

export class SmtpMailAdapter implements IMailAdapter {
  private readonly transporter: nodemailer.Transporter
  private readonly from: string
  private readonly frontendUrl: string

  constructor(cfg: Config) {
    this.from = cfg.SMTP_FROM
    this.frontendUrl = cfg.FRONTEND_URL
    this.transporter = nodemailer.createTransport({
      host: cfg.SMTP_HOST,
      port: cfg.SMTP_PORT,
      secure: cfg.SMTP_SECURE,
      auth: cfg.SMTP_USER ? { user: cfg.SMTP_USER, pass: cfg.SMTP_PASS } : undefined,
    })
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your QAuthority password',
      html: `<p>Click the link below to reset your password. It expires in 1 hour.</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>`,
    })
  }

  async sendNotification(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, html: body })
  }

  async sendWelcome(to: string, name?: string): Promise<void> {
    const displayName = name || 'there'
    const loginUrl = `${this.frontendUrl}/login`

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Welcome to QAuthority!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to QAuthority!</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px;">Hi <strong>${displayName}</strong>,</p>
            <p style="color: #666; font-size: 15px; line-height: 1.6;">
              Your account has been created successfully. You can now start managing your test plans, test suites, and track your test executions.
            </p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;"><strong>Your account:</strong></p>
              <p style="color: #333; font-size: 14px; margin: 0;"><strong>Email:</strong> ${to}</p>
              ${name ? `<p style="color: #333; font-size: 14px; margin: 5px 0 0 0;"><strong>Name:</strong> ${name}</p>` : ''}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Go to QAuthority
              </a>
            </div>
            <p style="color: #999; font-size: 13px; text-align: center;">
              If the button doesn't work, copy and paste this URL into your browser:<br>
              <a href="${loginUrl}" style="color: #667eea;">${loginUrl}</a>
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <hr style="border: none; border-top: 1px solid #eee; margin: 0 0 15px 0;">
            This is an automated message from QAuthority. Please do not reply to this email.
          </div>
        </div>
      `,
    })
  }
}
