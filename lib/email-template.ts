// Branded HTML email template for Laundry Co. notifications.
// Uses table-based layout + inline styles (standard for email clients).
// Brand colors per BRAND.md: cream #F5F1E8, navy #13304F, red #C73A29.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type RenderInput = {
  title: string
  body: string
  link?: string
  eyebrow?: string
  ctaLabel?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Inline the wordmark as a data URI so the logo renders regardless of where
// APP_BASE_URL points. Read once at module load time and cache.
let cachedLogoDataUri: string | null = null
function getLogoDataUri(): string | null {
  if (cachedLogoDataUri !== null) return cachedLogoDataUri
  try {
    const path = join(process.cwd(), 'public', 'brand', 'email', 'wordmark-320.png')
    const buffer = readFileSync(path)
    cachedLogoDataUri = `data:image/png;base64,${buffer.toString('base64')}`
    return cachedLogoDataUri
  } catch {
    cachedLogoDataUri = ''
    return null
  }
}

export function renderNotificationEmail({
  title,
  body,
  link,
  eyebrow = 'Laundry Co. · Shift ticket office',
  ctaLabel = 'Open scheduler',
}: RenderInput): string {
  const logoDataUri = getLogoDataUri()
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body).replace(/\n/g, '<br>')
  const safeEyebrow = escapeHtml(eyebrow)
  const safeLink = link ? escapeHtml(link) : null
  const safeCtaLabel = escapeHtml(ctaLabel)

  const logoCell = logoDataUri
    ? `<img src="${logoDataUri}" alt="The Laundry Co. — League City" width="240" style="display:block;width:240px;height:auto;max-width:240px;border:0;outline:none;text-decoration:none;">`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;color:#13304F;letter-spacing:-0.01em;">The Laundry Co.</div>`

  const ctaRow = safeLink
    ? `
          <tr>
            <td style="padding:24px 32px 0;">
              <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="background-color:#13304F;border-radius:2px;">
                    <a href="${safeLink}" style="display:inline-block;padding:12px 22px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#F5F1E8;text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">
                      ${safeCtaLabel} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1E8;color:#13304F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safeTitle} — ${safeBody.replace(/<br>/g, ' ')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1E8;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border:1px solid rgba(19,48,79,0.18);">
          <tr>
            <td align="center" style="padding:28px 32px 20px;">
              ${logoCell}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.35) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.6);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">
                ${safeEyebrow}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <h1 style="margin:0;font-size:30px;line-height:1.1;color:#13304F;font-family:Georgia,'Times New Roman',serif;font-weight:400;letter-spacing:-0.01em;">
                ${safeTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#13304F;">
                ${safeBody}
              </p>
            </td>
          </tr>${ctaRow}
          <tr>
            <td style="padding:32px;">
              <div style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.25) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;margin-bottom:16px;"></div>
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.5);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;text-align:center;">
                The Laundry Co. &middot; League City, TX &middot; Est. 2025
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:rgba(19,48,79,0.5);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;letter-spacing:0.08em;">
          You're receiving this because you're on the Laundry Co. team.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
