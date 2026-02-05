/**
 * Email utility using MailerSend
 * Documentation: https://developers.mailersend.com/general.html
 */

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend'
import type { InvitationEmailData } from '../shared/types/invitation'

function getMailerSendClient(apiKey: string) {
  return new MailerSend({ apiKey })
}

function getFromSender(): Sender {
  const fromEmail =
    process.env.MAIL_FROM_EMAIL ||
    process.env.MAILERSEND_FROM_EMAIL ||
    ''
  const fromName = process.env.MAIL_FROM_NAME || 'AICoder.Guru'

  // If not set, MailerSend will reject. We keep it explicit and log loudly.
  if (!fromEmail) {
    console.error('MAIL_FROM_EMAIL (or MAILERSEND_FROM_EMAIL) is not set')
  }
  return new Sender(fromEmail || '[email protected]', fromName)
}

function getAdminRecipient(): Recipient {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || ''
  const adminName = process.env.ADMIN_NOTIFICATION_NAME || 'Admin'
  if (!adminEmail) {
    console.error('ADMIN_NOTIFICATION_EMAIL (or ADMIN_EMAIL) is not set')
  }
  return new Recipient(adminEmail || '[email protected]', adminName)
}

function getMailerSendApiKey(apiKeyOverride?: string): string {
  const key = apiKeyOverride || process.env.MAILER_SEND_KEY || ''
  if (!key) {
    console.error('MAILER_SEND_KEY is not set (configure as a Secret for deployed functions)')
  }
  return key
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  recipientEmail: string,
  recipientName?: string,
  tier: string = 'novice'
): Promise<boolean> {
  try {
    console.log(`Sending welcome email to ${recipientEmail} (${tier} tier)`)

    const apiKey = getMailerSendApiKey()
    if (!apiKey) return false
    const mailerSend = getMailerSendClient(apiKey)
    const defaultSender = getFromSender()

    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo([new Recipient(recipientEmail, recipientName)])
      .setSubject('Welcome to AICoder.Guru! 🥋')
      .setHtml(getWelcomeEmailHTML(recipientName || 'there', tier))
      .setText(getWelcomeEmailText(recipientName || 'there', tier))

    await mailerSend.email.send(emailParams)
    console.log(`Welcome email sent successfully to ${recipientEmail}`)
    return true
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    console.error('Error details:', error.response?.body || error.message)
    return false
  }
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmation(
  recipientEmail: string,
  recipientName: string,
  tier: string,
  billingCycle: 'monthly' | 'annual'
): Promise<boolean> {
  try {
    console.log(`Sending subscription confirmation to ${recipientEmail}`)

    const apiKey = getMailerSendApiKey()
    if (!apiKey) return false
    const mailerSend = getMailerSendClient(apiKey)
    const defaultSender = getFromSender()

    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo([new Recipient(recipientEmail, recipientName)])
      .setSubject(`Welcome to ${getTierDisplayName(tier)}! 🎉`)
      .setHtml(getSubscriptionConfirmationHTML(recipientName, tier, billingCycle))
      .setText(getSubscriptionConfirmationText(recipientName, tier, billingCycle))

    await mailerSend.email.send(emailParams)
    console.log(`Subscription confirmation sent successfully to ${recipientEmail}`)
    return true
  } catch (error: any) {
    console.error('Error sending subscription confirmation:', error)
    console.error('Error details:', error.response?.body || error.message)
    return false
  }
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(
  recipientEmail: string,
  recipientName: string,
  tier: string
): Promise<boolean> {
  try {
    console.log(`Sending payment failed notification to ${recipientEmail}`)

    const apiKey = getMailerSendApiKey()
    if (!apiKey) return false
    const mailerSend = getMailerSendClient(apiKey)
    const defaultSender = getFromSender()

    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo([new Recipient(recipientEmail, recipientName)])
      .setSubject('Payment Failed - Action Required')
      .setHtml(getPaymentFailedHTML(recipientName, tier))
      .setText(getPaymentFailedText(recipientName, tier))

    await mailerSend.email.send(emailParams)
    console.log(`Payment failed email sent successfully to ${recipientEmail}`)
    return true
  } catch (error: any) {
    console.error('Error sending payment failed email:', error)
    console.error('Error details:', error.response?.body || error.message)
    return false
  }
}

/**
 * Send subscription canceled notification
 */
export async function sendSubscriptionCanceledEmail(
  recipientEmail: string,
  recipientName: string,
  tier: string,
  periodEnd: Date
): Promise<boolean> {
  try {
    console.log(`Sending subscription canceled notification to ${recipientEmail}`)

    const apiKey = getMailerSendApiKey()
    if (!apiKey) return false
    const mailerSend = getMailerSendClient(apiKey)
    const defaultSender = getFromSender()

    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo([new Recipient(recipientEmail, recipientName)])
      .setSubject('Your Subscription Has Been Canceled')
      .setHtml(getSubscriptionCanceledHTML(recipientName, tier, periodEnd))
      .setText(getSubscriptionCanceledText(recipientName, tier, periodEnd))

    await mailerSend.email.send(emailParams)
    console.log(`Subscription canceled email sent successfully to ${recipientEmail}`)
    return true
  } catch (error: any) {
    console.error('Error sending subscription canceled email:', error)
    console.error('Error details:', error.response?.body || error.message)
    return false
  }
}

/**
 * Send admin notification
 */
export async function sendAdminNotification(
  subject: string,
  message: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    console.log(`Sending admin notification: ${subject}`)

    const apiKey = getMailerSendApiKey()
    if (!apiKey) return false
    const mailerSend = getMailerSendClient(apiKey)
    const defaultSender = getFromSender()

    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo([getAdminRecipient()])
      .setSubject(`[AICoder.Guru Admin] ${subject}`)
      .setHtml(getAdminNotificationHTML(subject, message, data))
      .setText(getAdminNotificationText(subject, message, data))

    await mailerSend.email.send(emailParams)
    console.log(`Admin notification sent successfully`)
    return true
  } catch (error: any) {
    console.error('Error sending admin notification:', error)
    console.error('Error details:', error.response?.body || error.message)
    return false
  }
}

/**
 * Send organization invitation email
 */
export async function sendInvitationEmail(data: InvitationEmailData, apiKeyOverride?: string): Promise<boolean> {
  try {
    console.log(`Sending invitation email to ${data.recipientEmail} for ${data.organizationName}`)

    const apiKey = getMailerSendApiKey(apiKeyOverride)
    if (!apiKey) return false
    const mailerSend = getMailerSendClient(apiKey)
    const defaultSender = getFromSender()

    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo([new Recipient(data.recipientEmail)])
      .setSubject(`You're invited to join ${data.organizationName} on AICoder.Guru`)
      .setHtml(getInvitationEmailHTML(data))
      .setText(getInvitationEmailText(data))

    await mailerSend.email.send(emailParams)
    console.log(`Invitation email sent successfully to ${data.recipientEmail}`)
    return true
  } catch (error: any) {
    console.error('Error sending invitation email:', error)
    console.error('Error details:', error.response?.body || error.message)
    return false
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTierDisplayName(tier: string): string {
  const tierNames: Record<string, string> = {
    'free_individual': 'Novice',
    'team_apprentice': 'Apprentice',
    'team_sensei': 'Sensei',
    'team_master': 'Master',
    'enterprise': 'Grandmaster'
  }
  return tierNames[tier] || tier
}

function getWelcomeEmailHTML(name: string, tier: string): string {
  const tierName = getTierDisplayName(tier)
  const isFree = tier === 'free_individual' || tier === 'novice'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AICoder.Guru</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5E6D3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5E6D3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #114C5A 0%, #0A2E36 100%); padding: 40px 40px 30px 40px; text-align: center;">
              <img src="https://app.aicoder.guru/logos/fueld-logo-symbol-white.svg" alt="AICoder.Guru" style="width: 80px; height: 80px; margin-bottom: 20px;">
              <h1 style="color: #F5E6D3; margin: 0; font-size: 32px; font-weight: 700;">Welcome to AICoder.Guru! 🥋</h1>
              ${!isFree ? `<p style="color: #97D700; margin: 10px 0 0 0; font-size: 18px; font-weight: 600;">${tierName} Tier</p>` : ''}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #0A2E36; font-size: 18px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${name},
              </p>
              
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${isFree 
                  ? 'Thank you for joining AICoder.Guru! We\'re excited to help you track and optimize your AI coding assistant usage.'
                  : `Thank you for subscribing to our ${tierName} tier! We're thrilled to have you on board.`
                }
              </p>

              ${!isFree ? `
              <div style="background-color: #F5E6D3; border-left: 4px solid #97D700; padding: 20px; margin: 30px 0;">
                <h3 style="color: #0A2E36; margin: 0 0 10px 0; font-size: 18px;">Your ${tierName} Benefits:</h3>
                <ul style="color: #114C5A; margin: 10px 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                  ${getTierBenefits(tier)}
                </ul>
              </div>
              ` : `
              <div style="background-color: #F5E6D3; border-left: 4px solid #97D700; padding: 20px; margin: 30px 0;">
                <h3 style="color: #0A2E36; margin: 0 0 10px 0; font-size: 18px;">Get Started:</h3>
                <ul style="color: #114C5A; margin: 10px 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                  <li>Upload your Cursor usage CSV files</li>
                  <li>View your cost analytics and trends</li>
                  <li>Track your AI coding assistant spending</li>
                </ul>
              </div>
              `}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://app.aicoder.guru" style="display: inline-block; background-color: #97D700; color: #0A2E36; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #114C5A; font-size: 16px; line-height: 1.6; margin: 30px 0 20px 0;">
                If you have any questions, feel free to reach out to our support team at <a href="mailto:[email protected]" style="color: #97D700; text-decoration: none;">[email protected]</a>
              </p>

              <p style="color: #0A2E36; font-size: 16px; line-height: 1.6; margin: 0;">
                Best regards,<br>
                <strong>The AICoder.Guru Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5E6D3; padding: 30px; text-align: center;">
              <p style="color: #666666; font-size: 13px; margin: 0 0 10px 0;">
                Measure, Motivate, Master AI
              </p>
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2025 AICoder.Guru. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getWelcomeEmailText(name: string, tier: string): string {
  const tierName = getTierDisplayName(tier)
  const isFree = tier === 'free_individual' || tier === 'novice'

  return `
Welcome to AICoder.Guru! 🥋

Hi ${name},

${isFree 
  ? 'Thank you for joining AICoder.Guru! We\'re excited to help you track and optimize your AI coding assistant usage.'
  : `Thank you for subscribing to our ${tierName} tier! We're thrilled to have you on board.`
}

${!isFree ? `Your ${tierName} Benefits:
${getTierBenefitsText(tier)}

` : `Get Started:
- Upload your Cursor usage CSV files
- View your cost analytics and trends
- Track your AI coding assistant spending

`}Go to your dashboard: https://app.aicoder.guru

If you have any questions, feel free to reach out to our support team at [email protected]

Best regards,
The AICoder.Guru Team

---
Measure, Motivate, Master AI
© 2025 AICoder.Guru. All rights reserved.
  `.trim()
}

function getTierBenefits(tier: string): string {
  const benefits: Record<string, string[]> = {
    'team_apprentice': [
      'Up to 5 team members',
      '1-year data retention',
      'Team analytics dashboard',
      'Email support (72 hrs)'
    ],
    'team_sensei': [
      'Up to 10 team members',
      'API connection sync (1 service)',
      'Unlimited data retention',
      'Team analytics & breakdowns',
      'Role-based access control',
      'Export reports (PDF/CSV/Excel)'
    ],
    'team_master': [
      'Up to 30 team members',
      'API connection sync (3 services)',
      'Unlimited data retention',
      'Advanced team analytics',
      'Custom dashboards',
      'Priority support',
      'All export formats'
    ],
    'enterprise': [
      'Unlimited team members',
      'All API integrations',
      'Unlimited data retention',
      'Dedicated support',
      'Custom integrations',
      'SSO & SAML',
      'SLA guarantee'
    ]
  }

  const tierBenefits = benefits[tier] || []
  return tierBenefits.map(benefit => `<li>${benefit}</li>`).join('')
}

function getTierBenefitsText(tier: string): string {
  const benefits: Record<string, string[]> = {
    'team_apprentice': [
      'Up to 5 team members',
      '1-year data retention',
      'Team analytics dashboard',
      'Email support (72 hrs)'
    ],
    'team_sensei': [
      'Up to 10 team members',
      'API connection sync (1 service)',
      'Unlimited data retention',
      'Team analytics & breakdowns',
      'Role-based access control',
      'Export reports (PDF/CSV/Excel)'
    ],
    'team_master': [
      'Up to 30 team members',
      'API connection sync (3 services)',
      'Unlimited data retention',
      'Advanced team analytics',
      'Custom dashboards',
      'Priority support',
      'All export formats'
    ],
    'enterprise': [
      'Unlimited team members',
      'All API integrations',
      'Unlimited data retention',
      'Dedicated support',
      'Custom integrations',
      'SSO & SAML',
      'SLA guarantee'
    ]
  }

  const tierBenefits = benefits[tier] || []
  return tierBenefits.map(benefit => `- ${benefit}`).join('\n')
}

function getSubscriptionConfirmationHTML(name: string, tier: string, billingCycle: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F5E6D3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5E6D3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; padding: 40px;">
          <tr>
            <td>
              <h1 style="color: #0A2E36; margin: 0 0 20px 0;">Subscription Confirmed! 🎉</h1>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                Your subscription to the <strong>${getTierDisplayName(tier)}</strong> tier (${billingCycle}) has been confirmed.
              </p>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                You now have access to all ${getTierDisplayName(tier)} features. Visit your dashboard to get started!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://app.aicoder.guru/billing" style="display: inline-block; background-color: #97D700; color: #0A2E36; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      View Subscription
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getSubscriptionConfirmationText(name: string, tier: string, billingCycle: string): string {
  return `
Subscription Confirmed! 🎉

Hi ${name},

Your subscription to the ${getTierDisplayName(tier)} tier (${billingCycle}) has been confirmed.

You now have access to all ${getTierDisplayName(tier)} features. Visit your dashboard to get started!

View your subscription: https://app.aicoder.guru/billing

Best regards,
The AICoder.Guru Team
  `.trim()
}

function getPaymentFailedHTML(name: string, tier: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F5E6D3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5E6D3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; padding: 40px;">
          <tr>
            <td>
              <h1 style="color: #DC2626; margin: 0 0 20px 0;">Payment Failed - Action Required</h1>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                We were unable to process your payment for the ${getTierDisplayName(tier)} subscription.
              </p>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                Please update your payment method to avoid interruption of service.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://app.aicoder.guru/billing" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Update Payment Method
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getPaymentFailedText(name: string, tier: string): string {
  return `
Payment Failed - Action Required

Hi ${name},

We were unable to process your payment for the ${getTierDisplayName(tier)} subscription.

Please update your payment method to avoid interruption of service.

Update payment method: https://app.aicoder.guru/billing

Best regards,
The AICoder.Guru Team
  `.trim()
}

function getSubscriptionCanceledHTML(name: string, tier: string, periodEnd: Date): string {
  const formattedDate = periodEnd.toLocaleDateString('en-GB', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F5E6D3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5E6D3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; padding: 40px;">
          <tr>
            <td>
              <h1 style="color: #0A2E36; margin: 0 0 20px 0;">Subscription Canceled</h1>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                Your ${getTierDisplayName(tier)} subscription has been canceled. You will continue to have access until <strong>${formattedDate}</strong>.
              </p>
              <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">
                We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://app.aicoder.guru/billing" style="display: inline-block; background-color: #97D700; color: #0A2E36; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Reactivate Subscription
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getSubscriptionCanceledText(name: string, tier: string, periodEnd: Date): string {
  const formattedDate = periodEnd.toLocaleDateString('en-GB', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return `
Subscription Canceled

Hi ${name},

Your ${getTierDisplayName(tier)} subscription has been canceled. You will continue to have access until ${formattedDate}.

We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime.

Reactivate subscription: https://app.aicoder.guru/billing

Best regards,
The AICoder.Guru Team
  `.trim()
}

function getAdminNotificationHTML(subject: string, message: string, data?: Record<string, any>): string {
  const dataRows = data 
    ? Object.entries(data).map(([key, value]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${key}:</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${JSON.stringify(value)}</td>
        </tr>
      `).join('')
    : ''

  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="20" cellspacing="0">
    <tr>
      <td>
        <h2 style="color: #0A2E36;">${subject}</h2>
        <p style="color: #114C5A; font-size: 16px; line-height: 1.6;">${message}</p>
        ${data ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; border: 1px solid #ddd;">
            ${dataRows}
          </table>
        ` : ''}
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Timestamp: ${new Date().toISOString()}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getAdminNotificationText(subject: string, message: string, data?: Record<string, any>): string {
  const dataText = data 
    ? '\n\nData:\n' + Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')
    : ''

  return `
${subject}

${message}${dataText}

Timestamp: ${new Date().toISOString()}
  `.trim()
}

function getInvitationEmailHTML(data: InvitationEmailData): string {
  const expires = data.expiresAt.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const roleLabel =
    data.role === 'admin' ? 'Admin' : data.role === 'team_manager' ? 'Team Manager' : 'Member'

  // Use hosted logo assets (no MailerSend templates)
  const logoUrl = 'https://app.aicoder.guru/logos/logo-light.png'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join ${escapeHtml(data.organizationName)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F2E8CF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F2E8CF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #124C5A 0%, #0A2E36 100%); padding: 36px 40px; text-align: center;">
              <img src="${logoUrl}" alt="AICoder.Guru" style="height: 48px; width: auto; margin-bottom: 18px;">
              <h1 style="color: #F2E8CF; margin: 0; font-size: 26px; font-weight: 700;">You’ve been invited</h1>
              <p style="color: #F2E8CF; margin: 10px 0 0 0; font-size: 15px; opacity: 0.9;">
                Join <strong>${escapeHtml(data.organizationName)}</strong> on AICoder.Guru
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 40px;">
              <p style="color: #0A2E36; font-size: 16px; line-height: 1.6; margin: 0 0 14px 0;">
                <strong>${escapeHtml(data.inviterName)}</strong> (${escapeHtml(data.inviterEmail)}) invited you to join <strong>${escapeHtml(data.organizationName)}</strong>.
              </p>

              <div style="background-color: #F2E8CF; border-left: 4px solid #64BFA4; padding: 16px 18px; margin: 18px 0 26px 0;">
                <div style="color: #124C5A; font-size: 14px; line-height: 1.6;">
                  <div><strong>Role:</strong> ${roleLabel}</div>
                  ${data.teamName ? `<div><strong>Team:</strong> ${escapeHtml(data.teamName)}</div>` : ``}
                  <div><strong>Expires:</strong> ${escapeHtml(expires)}</div>
                </div>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 10px 0 22px 0;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(data.invitationUrl)}" style="display: inline-block; background-color: #F75C03; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 700;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #124C5A; font-size: 13px; line-height: 1.6; margin: 0 0 10px 0;">
                If the button doesn’t work, copy and paste this link:
              </p>
              <p style="word-break: break-all; color: #0A2E36; font-size: 12px; line-height: 1.5; margin: 0;">
                ${escapeHtml(data.invitationUrl)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #F2E8CF; padding: 24px 30px; text-align: center;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                Measure. Motivate. Master AI. — © ${new Date().getFullYear()} AICoder.Guru
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getInvitationEmailText(data: InvitationEmailData): string {
  const roleLabel =
    data.role === 'admin' ? 'Admin' : data.role === 'team_manager' ? 'Team Manager' : 'Member'

  return `
You’re invited to join ${data.organizationName} on AICoder.Guru

Inviter: ${data.inviterName} (${data.inviterEmail})
Role: ${roleLabel}${data.teamName ? `\nTeam: ${data.teamName}` : ''}
Expires: ${data.expiresAt.toLocaleString('en-GB')}

Accept invitation:
${data.invitationUrl}
  `.trim()
}

function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}























