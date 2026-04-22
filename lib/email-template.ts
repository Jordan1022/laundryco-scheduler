// Branded HTML email template for Laundry Co. notifications.
// Uses table-based layout + inline styles (standard for email clients).
// Brand colors per BRAND.md: cream #F5F1E8, navy #13304F, red #C73A29.
// When `logoUrl` and `logoUrlDark` are set, the template adapts to
// `prefers-color-scheme: dark` (Apple Mail, some Gmail, etc.).

type RenderInput = {
  title: string
  body: string
  link?: string
  logoUrl?: string
  /** Reversed / dark-background wordmark; pairs with `logoUrl` for adaptive emails */
  logoUrlDark?: string
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

function isHttpsUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function renderNotificationEmail({
  title,
  body,
  link,
  logoUrl,
  logoUrlDark,
  eyebrow = 'Laundry Co. · Shift ticket office',
  ctaLabel = 'Open scheduler',
}: RenderInput): string {
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body).replace(/\n/g, '<br>')
  const safeEyebrow = escapeHtml(eyebrow)
  const safeLink = link ? escapeHtml(link) : null
  const safeCtaLabel = escapeHtml(ctaLabel)
  // Gmail strips data: URIs from <img src>, so the logo must be a hosted
  // HTTPS URL. Fall back to a styled text wordmark if no URL is provided.
  const safeLogoUrl = logoUrl && isHttpsUrl(logoUrl) ? escapeHtml(logoUrl) : null
  const safeLogoUrlDark = logoUrlDark && isHttpsUrl(logoUrlDark) ? escapeHtml(logoUrlDark) : null
  const adaptive = Boolean(safeLogoUrl && safeLogoUrlDark)

  const textWordmark = `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;color:#13304F;letter-spacing:-0.01em;">The Laundry Co.</div>`

  let logoCell: string
  if (!safeLogoUrl) {
    logoCell = textWordmark
  } else if (adaptive) {
    logoCell = `<img class="email-logo-light" src="${safeLogoUrl}" alt="The Laundry Co. — League City" width="240" style="display:block;width:240px;height:auto;max-width:240px;border:0;outline:none;text-decoration:none;">
              <img class="email-logo-dark" src="${safeLogoUrlDark}" alt="The Laundry Co. — League City" width="240" style="display:none;width:240px;height:auto;max-width:240px;border:0;outline:none;text-decoration:none;">`
  } else {
    logoCell = `<img src="${safeLogoUrl}" alt="The Laundry Co. — League City" width="240" style="display:block;width:240px;height:auto;max-width:240px;border:0;outline:none;text-decoration:none;">`
  }

  const ctaRow = safeLink
    ? `
          <tr>
            <td class="email-cta-outer" style="padding:24px 32px 0;">
              <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td class="email-cta-td" style="background-color:#13304F;border-radius:2px;">
                    <a href="${safeLink}" class="email-cta-link" style="display:inline-block;padding:12px 22px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#F5F1E8;text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">
                      ${safeCtaLabel} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : ''

  const headColorMeta = adaptive
    ? `  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style type="text/css">
    @media (prefers-color-scheme: dark) {
      body.email-adaptive { background-color: #0a0a0a !important; color: #E8E4DB !important; }
      body.email-adaptive .email-outer { background-color: #0a0a0a !important; }
      body.email-adaptive .email-card {
        background-color: #121212 !important;
        border: 1px solid rgba(245, 241, 232, 0.12) !important;
      }
      body.email-adaptive .email-eyebrow { color: rgba(245, 241, 232, 0.55) !important; }
      body.email-adaptive .email-h1 { color: #F5F1E8 !important; }
      body.email-adaptive .email-body-text { color: #E8E4DB !important; }
      body.email-adaptive .email-footer-meta { color: rgba(245, 241, 232, 0.45) !important; }
      body.email-adaptive .email-legal { color: rgba(245, 241, 232, 0.45) !important; }
      body.email-adaptive .email-divider { background-image: linear-gradient(to right, rgba(245, 241, 232, 0.35) 50%, transparent 0) !important; }
      body.email-adaptive .email-footer-line { background-image: linear-gradient(to right, rgba(245, 241, 232, 0.22) 50%, transparent 0) !important; }
      body.email-adaptive .email-cta-td { background-color: #1e3a5f !important; }
      body.email-adaptive .email-logo-light { display: none !important; }
      body.email-adaptive .email-logo-dark { display: block !important; }
    }
  </style>`
    : `  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">`

  const bodyOpen = adaptive
    ? '<body class="email-adaptive" style="margin:0;padding:0;background-color:#F5F1E8;color:#13304F;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">'
    : '<body style="margin:0;padding:0;background-color:#F5F1E8;color:#13304F;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">'

  const tableOuter = adaptive
    ? '<table class="email-outer" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1E8;">'
    : '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1E8;">'

  const tableCard = adaptive
    ? '<table class="email-card" role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border:1px solid rgba(19,48,79,0.18);">'
    : '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border:1px solid rgba(19,48,79,0.18);">'

  const eyebrowP = adaptive
    ? `<p class="email-eyebrow" style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.6);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">
                ${safeEyebrow}
              </p>`
    : `<p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.6);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">
                ${safeEyebrow}
              </p>`

  const titleH1 = adaptive
    ? `<h1 class="email-h1" style="margin:0;font-size:30px;line-height:1.1;color:#13304F;font-family:Georgia,'Times New Roman',serif;font-weight:400;letter-spacing:-0.01em;">
                ${safeTitle}
              </h1>`
    : `<h1 style="margin:0;font-size:30px;line-height:1.1;color:#13304F;font-family:Georgia,'Times New Roman',serif;font-weight:400;letter-spacing:-0.01em;">
                ${safeTitle}
              </h1>`

  const bodyP = adaptive
    ? `<p class="email-body-text" style="margin:0;font-size:15px;line-height:1.6;color:#13304F;">
                ${safeBody}
              </p>`
    : `<p style="margin:0;font-size:15px;line-height:1.6;color:#13304F;">
                ${safeBody}
              </p>`

  const divider1 = adaptive
    ? '<div class="email-divider" style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.35) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;"></div>'
    : '<div style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.35) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;"></div>'

  const footerBlock = adaptive
    ? `              <div class="email-footer-line" style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.25) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;margin-bottom:16px;"></div>
              <p class="email-footer-meta" style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.5);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;text-align:center;">
                The Laundry Co. &middot; League City, TX &middot; Est. 2025
              </p>`
    : `              <div style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.25) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;margin-bottom:16px;"></div>
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.5);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;text-align:center;">
                The Laundry Co. &middot; League City, TX &middot; Est. 2025
              </p>`

  const legalP = adaptive
    ? `<p class="email-legal" style="margin:16px 0 0;font-size:11px;color:rgba(19,48,79,0.5);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;letter-spacing:0.08em;">
          You're receiving this because you're on the Laundry Co. team.
        </p>`
    : `<p style="margin:16px 0 0;font-size:11px;color:rgba(19,48,79,0.5);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;letter-spacing:0.08em;">
          You're receiving this because you're on the Laundry Co. team.
        </p>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
${headColorMeta}
  <title>${safeTitle}</title>
</head>
${bodyOpen}
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safeTitle} — ${safeBody.replace(/<br>/g, ' ')}</div>
  ${tableOuter}
    <tr>
      <td align="center" style="padding:32px 16px;">
        ${tableCard}
          <tr>
            <td align="center" style="padding:28px 32px 20px;">
              ${logoCell}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              ${divider1}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              ${eyebrowP}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              ${titleH1}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              ${bodyP}
            </td>
          </tr>${ctaRow}
          <tr>
            <td style="padding:32px;">
${footerBlock}
            </td>
          </tr>
        </table>
        ${legalP}
      </td>
    </tr>
  </table>
</body>
</html>`
}
