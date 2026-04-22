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

type OnboardingRenderInput = {
  firstName: string
  loginEmail: string
  tempPassword: string
  loginUrl: string
  logoUrl?: string
  logoUrlDark?: string
}

/**
 * Welcome email for staff onboarding onto the scheduler. Includes sign-in
 * credentials (email + temporary password), a CTA into the app, home-screen
 * install instructions for iOS/Android, and a note about push notifications.
 */
export function renderOnboardingEmail({
  firstName,
  loginEmail,
  tempPassword,
  loginUrl,
  logoUrl,
  logoUrlDark,
}: OnboardingRenderInput): string {
  const safeFirstName = escapeHtml(firstName || 'there')
  const safeLoginEmail = escapeHtml(loginEmail)
  const safeTempPassword = escapeHtml(tempPassword)
  const safeLoginUrl = escapeHtml(loginUrl)
  const safeLogoUrl = logoUrl && isHttpsUrl(logoUrl) ? escapeHtml(logoUrl) : null
  const safeLogoUrlDark = logoUrlDark && isHttpsUrl(logoUrlDark) ? escapeHtml(logoUrlDark) : null
  const adaptive = Boolean(safeLogoUrl && safeLogoUrlDark)

  const subjectTitle = 'Welcome to the Laundry Co. Scheduler'
  const preheader = `Sign-in info inside. Works on your phone too.`

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
      body.email-adaptive .email-section-heading { color: #F5F1E8 !important; }
      body.email-adaptive .email-credentials {
        background-color: rgba(245, 241, 232, 0.04) !important;
        border-color: rgba(245, 241, 232, 0.18) !important;
      }
      body.email-adaptive .email-credentials-label { color: rgba(245, 241, 232, 0.55) !important; }
      body.email-adaptive .email-credentials-value { color: #F5F1E8 !important; }
      body.email-adaptive .email-step-num { color: rgba(245, 241, 232, 0.55) !important; }
      body.email-adaptive .email-step-text { color: #E8E4DB !important; }
      body.email-adaptive .email-tip { color: rgba(232, 228, 219, 0.8) !important; }
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

  const cls = (name: string) => (adaptive ? ` class="${name}"` : '')

  const credentialsBlock = `
              <table${cls('email-credentials')} role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(19,48,79,0.04);border:1px dashed rgba(19,48,79,0.3);border-radius:2px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p${cls('email-credentials-label')} style="margin:0 0 2px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.55);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">Sign-in email</p>
                    <p${cls('email-credentials-value')} style="margin:0;font-size:15px;color:#13304F;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;word-break:break-all;">${safeLoginEmail}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 16px 14px;">
                    <p${cls('email-credentials-label')} style="margin:0 0 2px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.55);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">Temporary password</p>
                    <p${cls('email-credentials-value')} style="margin:0;font-size:17px;color:#13304F;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:700;letter-spacing:0.02em;">${safeTempPassword}</p>
                  </td>
                </tr>
              </table>`

  const ctaRow = `
          <tr>
            <td style="padding:24px 32px 0;">
              <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td class="email-cta-td" style="background-color:#13304F;border-radius:2px;">
                    <a href="${safeLoginUrl}" style="display:inline-block;padding:12px 22px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#F5F1E8;text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">
                      Open the scheduler &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`

  const installStep = (num: string, label: string, instructions: string) => `
                <tr>
                  <td style="padding:0 0 10px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="42" valign="top" style="padding-top:1px;">
                          <span${cls('email-step-num')} style="display:inline-block;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.55);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:700;">${num}</span>
                        </td>
                        <td valign="top">
                          <p${cls('email-step-text')} style="margin:0;font-size:14px;line-height:1.5;color:#13304F;"><strong>${label}.</strong> ${instructions}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
${headColorMeta}
  <title>${escapeHtml(subjectTitle)}</title>
</head>
${bodyOpen}
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
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
              <div${cls('email-divider')} style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.35) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <p${cls('email-eyebrow')} style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.6);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-weight:600;">
                Welcome &middot; New scheduling app
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <h1${cls('email-h1')} style="margin:0;font-size:30px;line-height:1.1;color:#13304F;font-family:Georgia,'Times New Roman',serif;font-weight:400;letter-spacing:-0.01em;">
                Hi ${safeFirstName}, your scheduling app is ready.
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              <p${cls('email-body-text')} style="margin:0;font-size:15px;line-height:1.6;color:#13304F;">
                You already work with us &mdash; this is just our new tool for seeing shifts, requesting time off, and trading with a coworker. Sign in once with the details below and you&rsquo;re set.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              ${credentialsBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 32px 0;">
              <p${cls('email-tip')} style="margin:0;font-size:12px;line-height:1.5;color:rgba(19,48,79,0.7);">
                You can change this password after signing in under <em>Change password</em>.
              </p>
            </td>
          </tr>${ctaRow}
          <tr>
            <td style="padding:32px 32px 0;">
              <div${cls('email-divider')} style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.35) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <p${cls('email-section-heading')} style="margin:0 0 12px;font-size:18px;line-height:1.2;color:#13304F;font-family:Georgia,'Times New Roman',serif;font-weight:400;">
                Save it to your phone
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${installStep('iPhone', 'Safari', 'Open this email in Safari, tap the Share icon, scroll down and tap &ldquo;Add to Home Screen&rdquo;, then tap Add.')}
                ${installStep('Android', 'Chrome', 'Open in Chrome, tap the &#8942; menu, then tap &ldquo;Install app&rdquo; (or &ldquo;Add to Home screen&rdquo; on older versions).')}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              <p${cls('email-section-heading')} style="margin:0 0 8px;font-size:18px;line-height:1.2;color:#13304F;font-family:Georgia,'Times New Roman',serif;font-weight:400;">
                Stay notified
              </p>
              <p${cls('email-body-text')} style="margin:0;font-size:14px;line-height:1.55;color:#13304F;">
                After you sign in, your browser may ask for permission to send notifications. Tap <strong>Allow</strong> so you get a heads-up when a shift is assigned, rescheduled, or cancelled.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div${cls('email-footer-line')} style="height:1px;background-image:linear-gradient(to right, rgba(19,48,79,0.25) 50%, transparent 0);background-size:10px 1px;background-repeat:repeat-x;margin-bottom:16px;"></div>
              <p${cls('email-footer-meta')} style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(19,48,79,0.5);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;text-align:center;">
                The Laundry Co. &middot; League City, TX &middot; Est. 2025
              </p>
            </td>
          </tr>
        </table>
        <p${cls('email-legal')} style="margin:16px 0 0;font-size:11px;color:rgba(19,48,79,0.5);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;letter-spacing:0.08em;">
          You're receiving this because you're on the Laundry Co. team.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderOnboardingEmailText({
  firstName,
  loginEmail,
  tempPassword,
  loginUrl,
}: Omit<OnboardingRenderInput, 'logoUrl' | 'logoUrlDark'>): string {
  return [
    `Hi ${firstName || 'there'},`,
    '',
    `Welcome to the Laundry Co. Scheduler — our new tool for seeing shifts, requesting time off, and trading with a coworker. Sign in once with the details below.`,
    '',
    `Sign-in email: ${loginEmail}`,
    `Temporary password: ${tempPassword}`,
    `Open the scheduler: ${loginUrl}`,
    '',
    `You can change this password after signing in under Change password.`,
    '',
    `SAVE IT TO YOUR PHONE`,
    `  iPhone (Safari): Open in Safari → Share icon → "Add to Home Screen" → Add.`,
    `  Android (Chrome): Open in Chrome → ⋮ menu → "Install app" (or "Add to Home screen").`,
    '',
    `STAY NOTIFIED`,
    `After you sign in, tap Allow if your browser asks about notifications — you'll get a heads-up when a shift is assigned, rescheduled, or cancelled.`,
    '',
    `— The Laundry Co.`,
  ].join('\n')
}
