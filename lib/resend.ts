type SendEmailInput = {
  to: string
  subject: string
  text: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'

export async function sendEmailWithResend(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM

  if (!apiKey || !fromEmail) {
    return {
      sent: false as const,
      reason: 'missing-config' as const,
      hasApiKey: Boolean(apiKey),
      hasFromEmail: Boolean(fromEmail),
    }
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Resend email failed: ${response.status} ${errorBody}`)
  }

  return { sent: true as const }
}
