// The Green Mile Boosters — Email Templates
//
// All user-supplied values (names, notes, team members, order details, etc.)
// are passed through esc() before interpolation. Unescaped HTML in emails is
// a phishing / spoofing vector even with modern email-client sanitizers.

import { esc } from '../../_lib/escapeHtml.js'

const BASE = {
  green:     '#18532a',
  greenDark: '#0f3d1e',
  silver:    '#a8a9ad',
  nearBlack: '#111827',
  gray:      '#6b7280',
  lightGray: '#f4f5f7',
  border:    '#e2e5ea',
  white:     '#ffffff',
}

// Shared wrapper — pass hero HTML to render between header and body
function wrap({ title, preheader = '', hero = '', body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #e2e4e8; font-family: Arial, Helvetica, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #fff; border-radius: 14px; overflow: hidden; border: 1px solid ${BASE.border}; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    /* Site-style header: dark-green with silver pinstripes, Green Mile Boosters brand + subhead bar. */
    .header { background: ${BASE.green}; background-image: repeating-linear-gradient(to right, rgba(168,169,173,0.08) 0px, rgba(168,169,173,0.08) 1px, transparent 1px, transparent 28px); padding: 30px 28px 22px; text-align: center; }
    .header-eyebrow { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 11px; color: rgba(255,255,255,0.65); letter-spacing: 3px; text-transform: uppercase; line-height: 1; margin-bottom: 10px; }
    .header-title { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: 5px; line-height: 1; text-transform: uppercase; }
    .header-rule { width: 48px; height: 2px; background: rgba(255,255,255,0.35); margin: 14px auto 10px; border-radius: 1px; }
    .header-sub { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 11px; color: rgba(255,255,255,0.65); letter-spacing: 3px; text-transform: uppercase; }
    .subhead { background: #0f3d1e; padding: 8px 28px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); }
    .subhead-text { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 11px; color: rgba(255,255,255,0.75); letter-spacing: 3.5px; text-transform: uppercase; line-height: 1; }
    .body { padding: 30px 32px; }
    .footer { padding: 22px 28px; background: ${BASE.lightGray}; border-top: 1px solid ${BASE.border}; text-align: center; }
    .footer p { margin: 0; font-size: 11px; color: ${BASE.gray}; line-height: 1.85; font-family: Arial, Helvetica, sans-serif; }
    .footer a { color: ${BASE.green}; text-decoration: none; font-weight: 600; }
    .footer-brand { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 12px; color: ${BASE.green}; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px !important; }
    h1 { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700; color: ${BASE.nearBlack}; letter-spacing: 1px; margin: 0 0 12px; text-transform: uppercase; }
    p { font-size: 15px; color: #374151; line-height: 1.75; margin: 0 0 14px; font-family: Arial, Helvetica, sans-serif; }
    .section-label { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 11px; letter-spacing: 3px; color: ${BASE.green}; margin: 22px 0 10px; text-transform: uppercase; font-weight: 700; }
    .divider { height: 1px; background: ${BASE.border}; margin: 22px 0; }
    .btn { display: inline-block; padding: 14px 32px; background: ${BASE.green}; color: #fff !important; text-decoration: none; border-radius: 8px; font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 14px; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; box-shadow: 0 4px 14px rgba(24,83,42,0.25); }
    .btn-ghost { display: inline-block; padding: 14px 32px; background: #ffffff; color: ${BASE.green} !important; text-decoration: none; border-radius: 8px; font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 14px; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; border: 1.5px solid ${BASE.green}; }
    .pin-box { background: #f0f7f2; border: 2px solid ${BASE.green}; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
    .pin-digits { font-family: 'Courier New', Courier, monospace; font-size: 48px; font-weight: 700; color: ${BASE.green}; letter-spacing: 12px; line-height: 1; }
    .pin-label { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 10px; letter-spacing: 2.5px; color: ${BASE.gray}; margin-top: 10px; text-transform: uppercase; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid ${BASE.border}; font-size: 14px; font-family: Arial, Helvetica, sans-serif; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: ${BASE.gray}; font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; }
    .info-value { color: ${BASE.nearBlack}; font-weight: 700; text-align: right; }
    .stat-box { background: #f0f7f2; border-radius: 12px; padding: 22px 24px; margin: 18px 0; text-align: center; border: 1px solid #c8e0d1; }
    .stat-box-label { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 10px; letter-spacing: 2.5px; color: ${BASE.gray}; text-transform: uppercase; margin: 0 0 6px; }
    .stat-box-value { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 38px; font-weight: 700; color: ${BASE.green}; line-height: 1.1; margin: 0; letter-spacing: 1px; }
    .stat-box-sub { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: ${BASE.gray}; margin-top: 6px; }
    .impact-bar { background: #f0f7f2; border-left: 4px solid ${BASE.green}; padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 22px 0; }
    .impact-bar-title { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 10px; letter-spacing: 2.5px; color: ${BASE.green}; margin: 0 0 6px; text-transform: uppercase; font-weight: 700; }
    .impact-bar p { margin: 0; font-size: 13px; color: #374151; line-height: 1.65; }
    .notice { background: #f4f5f7; border: 1px solid #d8dbe0; border-radius: 10px; padding: 16px 20px; margin: 18px 0; }
    .notice p { margin: 0; font-size: 13px; color: #374151; line-height: 1.65; }
    .account-notice { background: #f0f7f2; border: 1px solid #a7d4b3; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
    .account-notice p { margin: 0; font-size: 14px; color: ${BASE.green}; line-height: 1.6; }
    .player-card { background: #f8f9fa; border: 1px solid ${BASE.border}; border-radius: 10px; padding: 14px 18px; margin-bottom: 8px; }
    .player-name { font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 15px; color: ${BASE.nearBlack}; font-weight: 700; letter-spacing: 0.5px; }
    .player-sub { font-size: 13px; color: ${BASE.gray}; margin-top: 3px; font-family: Arial, Helvetica, sans-serif; }
    @media (max-width: 600px) {
      .wrapper { padding: 12px 8px; }
      .body { padding: 22px 20px; }
      .header { padding: 24px 20px 18px; }
      .header-title { font-size: 22px; letter-spacing: 4px; }
      .pin-digits { font-size: 38px; letter-spacing: 8px; }
      .stat-box-value { font-size: 30px; }
      h1 { font-size: 22px; }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${esc(preheader)}</div>` : ''}
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-eyebrow">&#127944; GREEN MILE BOOSTERS</div>
        <div class="header-title">The Green Mile Boosters</div>
        <div class="header-rule"></div>
        <div class="header-sub">Supporting Dinuba Emperors Football</div>
      </div>
      ${hero}
      <div class="body">
        ${body}
      </div>
      <div class="footer">
        <p class="footer-brand">The Green Mile Boosters</p>
        <p><a href="https://greenmileboosters.org">greenmileboosters.org</a> &middot; <a href="mailto:info@greenmileboosters.org">info@greenmileboosters.org</a></p>
        <p style="margin-top:8px;color:#9ca3af;font-size:11px;">Please do not reply to this email. Contact us at info@greenmileboosters.org</p>
        <p style="color:#9ca3af;font-size:11px;">You are receiving this because you registered with The Green Mile Boosters.</p>
        <p style="margin-top:8px;color:#9ca3af;font-size:11px;">The Green Mile Boosters is a registered 501(c)(3) nonprofit &middot; EIN 92-2360865<br/>Dinuba, California</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ── PIN Delivery ───────────────────────────────────────────────────────────────
export function pinEmail({ firstName, pin, eventType, isPassword }) {
  const eventLabel = eventType === 'golf'   ? 'Emperors Golf Tournament'
    : eventType === 'camp'   ? 'Emperors Football Camp'
    : eventType === 'alumni' ? 'Alumni Game'
    : 'The Green Mile Boosters'

  // Pin / welcome emails lean on the site-style wrapper header for branding —
  // no per-event hero needed here.
  const hero = ''

  if (isPassword) {
    return {
      subject: `Welcome to The Green Mile Boosters`,
      html: wrap({
        title: 'Account Created',
        preheader: `Your The Green Mile Boosters account is ready.`,
        hero,
        body: `
          <h1>Welcome, ${esc(firstName)}!</h1>
          <p>Your The Green Mile Boosters account has been created. Sign in anytime at the link below using your email address and the password you created.</p>
          <a href="https://greenmileboosters.org/my-account/login" class="btn">SIGN IN TO MY ACCOUNT</a>
          <div class="divider"></div>
          <p style="font-size:13px;color:${BASE.gray};">If you did not create this account, contact us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
        `
      })
    }
  }

  return {
    subject: `Your Account PIN — The Green Mile Boosters`,
    html: wrap({
      title: 'Your Account PIN',
      preheader: `Your 6-digit PIN is ready. Save it — you'll need it to log in.`,
      hero,
      body: `
        <h1>Welcome, ${esc(firstName)}!</h1>
        <p>Your The Green Mile Boosters account has been created. Use the PIN below to log in at any time with your email or phone number.</p>

        <div class="pin-box">
          <div class="pin-digits">${pin}</div>
          <div class="pin-label">YOUR 6-DIGIT PIN &mdash; KEEP THIS SAFE</div>
        </div>

        <p>Once signed in you can view your registrations, check upcoming events, and manage your account — all in one place.</p>

        <div class="divider"></div>

        <p class="section-label">REGISTERED FOR</p>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:18px;color:${BASE.green};font-weight:700;margin:0 0 24px;">${eventLabel}</p>

        <a href="https://greenmileboosters.org/my-account/login" class="btn">SIGN IN TO MY ACCOUNT</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">If you did not register with The Green Mile Boosters, you can safely ignore this email. For help, contact us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Golf Registration Confirmation ─────────────────────────────────────────────
export function golfConfirmationEmail({ firstName, lastName, email, entryType, sponsor, addons, total, paymentStatus, teamMembers, eventDate, isNewAccount }) {
  const formatDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) : null
  const payLabel = paymentStatus === 'pay_at_event' ? 'Pay at Event' : paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'waived' ? 'Waived' : 'Pending'
  const dateLabel = formatDate(eventDate)

  const teamRows = Array.isArray(teamMembers) && teamMembers.length > 1
    ? teamMembers.map(m => `<div class="info-row"><span class="info-label">Slot #${m.slot}:</span><span class="info-value">${esc(m.name)}</span></div>`).join('')
    : ''

  const hero = `
    <div style="background:linear-gradient(135deg,#0d0d0d 0%,#1c1c1c 100%);padding:28px 28px 24px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">⛳</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Emperors Golf Tournament</div>
      ${dateLabel ? `<div style="display:inline-block;background:rgba(200,200,200,0.12);border:1px solid rgba(200,200,200,0.22);border-radius:99px;padding:5px 18px;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#c8c8c8;letter-spacing:2px;text-transform:uppercase;">${dateLabel}</span>
      </div>` : ''}
    </div>`

  return {
    subject: `Registration Confirmed — Emperors Golf Tournament`,
    html: wrap({
      title: 'Golf Tournament Registration Confirmed',
      preheader: `Registration confirmed for the Emperors Golf Tournament. See you on the course!`,
      hero,
      body: `
        <h1>You're Registered! ⛳</h1>
        <p>Thanks, <strong>${esc(firstName)}</strong>! Your registration for the <strong>Emperors Golf Tournament</strong> has been received. We'll see you on the course.</p>

        ${total > 0 ? `
        <div class="stat-box">
          <p class="stat-box-label">Registration Total</p>
          <p class="stat-box-value">$${(total).toLocaleString()}</p>
          <p class="stat-box-sub">${payLabel}</p>
        </div>` : ''}

        <p class="section-label">EVENT DETAILS</p>
        <div style="margin-bottom:20px;">
          ${dateLabel ? `<div class="info-row"><span class="info-label">Date:</span><span class="info-value">${dateLabel}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Location:</span><span class="info-value">Ridge Creek Dinuba Golf Club</span></div>
          <div class="info-row"><span class="info-label">Format:</span><span class="info-value">Four-Person Scramble</span></div>
        </div>

        <p class="section-label">REGISTRATION SUMMARY</p>
        <div style="margin-bottom:20px;">
          ${entryType ? `<div class="info-row"><span class="info-label">Entry:</span><span class="info-value">${entryType === 'group' ? 'Group (4 Players)' : 'Individual'}</span></div>` : ''}
          ${sponsor ? `<div class="info-row"><span class="info-label">Sponsorship:</span><span class="info-value">${sponsor.charAt(0).toUpperCase() + sponsor.slice(1)} Sponsor</span></div>` : ''}
          <div class="info-row"><span class="info-label">Payment:</span><span class="info-value">${payLabel}</span></div>
        </div>

        ${teamRows ? `<p class="section-label">YOUR TEAM</p><div style="margin-bottom:20px;">${teamRows}</div>` : ''}

        ${paymentStatus === 'pay_at_event' ? `
        <div class="notice">
          <p><strong>Payment reminder:</strong> You selected Pay at Event. Please bring your payment on tournament day. We accept cash and check.</p>
        </div>` : ''}

        ${isNewAccount ? `
        <div class="account-notice">
          <p><strong>An account has been created for you.</strong> Check your email for your PIN &mdash; you'll use it to log in and view your registration details.</p>
        </div>` : ''}

        <a href="https://greenmileboosters.org/my-account/login" class="btn">VIEW MY ACCOUNT</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions? Email us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Camp Registration Confirmation ─────────────────────────────────────────────
export function campConfirmationEmail({ parentFirst, parentLast, email, players, eventDate, paymentStatus, isNewAccount }) {
  const formatDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) : null
  const payLabel = paymentStatus === 'pay_at_camp' ? 'Pay at Camp' : paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'waived' ? 'Waived' : 'Pending'
  const dateLabel = formatDate(eventDate)

  const playerRows = Array.isArray(players)
    ? players.map(p => `
        <div class="player-card">
          <div class="player-name">${esc(p.firstName)} ${esc(p.lastName)}</div>
          <div class="player-sub">${[p.shirtSize ? `Shirt: ${esc(p.shirtSize)}` : null].filter(Boolean).join(' &middot; ') || 'Registered'}</div>
        </div>`).join('')
    : ''

  const hero = `
    <div style="background:linear-gradient(135deg,#0f3d1e 0%,#18532a 100%);padding:28px 28px 24px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">🏈</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Emperors Football Camp</div>
      ${dateLabel ? `<div style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:99px;padding:5px 18px;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;">${dateLabel}</span>
      </div>` : ''}
    </div>`

  return {
    subject: `Registration Confirmed — Emperors Football Camp`,
    html: wrap({
      title: 'Football Camp Registration Confirmed',
      preheader: `Registration confirmed for Emperors Football Camp. We'll see you on the field!`,
      hero,
      body: `
        <h1>You're In! 🏈</h1>
        <p>Thanks, <strong>${esc(parentFirst)}</strong>! Your registration for <strong>Emperors Football Camp</strong> has been received. Get ready for a great day on the Green Mile.</p>

        <p class="section-label">EVENT DETAILS</p>
        <div style="margin-bottom:20px;">
          ${dateLabel ? `<div class="info-row"><span class="info-label">Date:</span><span class="info-value">${dateLabel}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Location:</span><span class="info-value">Dinuba High School — The Green Mile</span></div>
          <div class="info-row"><span class="info-label">Payment:</span><span class="info-value">${payLabel}</span></div>
        </div>

        <p class="section-label">REGISTERED PLAYERS</p>
        <div style="margin-bottom:20px;">${playerRows}</div>

        ${paymentStatus === 'pay_at_camp' ? `
        <div class="notice">
          <p><strong>Payment reminder:</strong> You selected Pay at Camp. Please bring your payment on the day of the event.</p>
        </div>` : ''}

        ${isNewAccount ? `
        <div class="account-notice">
          <p><strong>An account has been created for you.</strong> Check your email for your PIN &mdash; you'll use it to log in and manage your registration.</p>
        </div>` : ''}

        <a href="https://greenmileboosters.org/my-account/login" class="btn">VIEW MY ACCOUNT</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions? Email us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Tax Receipt ────────────────────────────────────────────────────────────────
export function taxReceiptEmail({ email, amount, donationDate }) {
  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })

  const hero = `
    <div style="background:#0f3d1e;padding:22px 28px;text-align:center;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;">Donation Receipt</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:2px;margin-top:5px;text-transform:uppercase;">The Green Mile Boosters &middot; 501(c)(3) Nonprofit</div>
    </div>`

  return {
    subject: `Donation Receipt — The Green Mile Boosters`,
    html: wrap({
      title: 'Donation Receipt',
      preheader: `Your donation receipt from The Green Mile Boosters.`,
      hero,
      body: `
        <h1>Thank You! 💚</h1>
        <p>Thank you for your generous donation to The Green Mile Boosters. Your support keeps Dinuba Emperors Football strong in our community.</p>

        ${amount ? `
        <div class="stat-box">
          <p class="stat-box-label">Donation Amount</p>
          <p class="stat-box-value">$${amount}</p>
          <p class="stat-box-sub">${formatDate(donationDate)}</p>
        </div>` : ''}

        <p class="section-label">RECEIPT DETAILS</p>
        <div style="margin-bottom:20px;">
          <div class="info-row"><span class="info-label">Organization:</span><span class="info-value">The Green Mile Boosters</span></div>
          <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${formatDate(donationDate)}</span></div>
          ${amount ? `<div class="info-row"><span class="info-label">Amount:</span><span class="info-value">$${amount}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Payment:</span><span class="info-value">Processed via Stripe</span></div>
        </div>

        <div class="impact-bar">
          <p class="impact-bar-title">Tax Information</p>
          <p>The Green Mile Boosters is a 501(c)(3) nonprofit organization. No goods or services were provided in exchange for this contribution. Please retain this email as your record of donation.</p>
        </div>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions about your donation? Contact us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Golf Tournament Reminder ───────────────────────────────────────────────────
export function golfReminderEmail({ firstName, eventDate, location, shotgunTime, paymentStatus, entryType, sponsor }) {
  const formatDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) : null
  const payLabel = paymentStatus === 'pay_at_event' ? 'Pay at Event — please bring payment on tournament day' : paymentStatus === 'paid' ? 'Paid — you\'re all set!' : 'Pending'
  const isPAE = paymentStatus === 'pay_at_event'
  const dateLabel = formatDate(eventDate)

  const hero = `
    <div style="background:linear-gradient(135deg,#0d0d0d 0%,#1c1c1c 100%);padding:28px 28px 24px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">⛳</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Emperors Golf Tournament</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#a8a9ad;letter-spacing:2px;text-transform:uppercase;">Coming Up Soon</div>
    </div>`

  return {
    subject: `Reminder — Emperors Golf Tournament is Coming Up!`,
    html: wrap({
      title: 'Golf Tournament Reminder',
      preheader: `The Emperors Golf Tournament is just around the corner. Here's everything you need to know.`,
      hero,
      body: `
        <h1>See You on the Course! ⛳</h1>
        <p>Hi <strong>${esc(firstName)}</strong>, this is a friendly reminder that the <strong>Emperors Golf Tournament</strong> is coming up soon. We're looking forward to seeing you!</p>

        <p class="section-label">EVENT DETAILS</p>
        <div style="margin-bottom:20px;">
          ${dateLabel ? `<div class="info-row"><span class="info-label">Date:</span><span class="info-value">${dateLabel}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Location:</span><span class="info-value">${location || 'Ridge Creek Dinuba Golf Club'}</span></div>
          ${shotgunTime ? `<div class="info-row"><span class="info-label">Shotgun Start:</span><span class="info-value">${shotgunTime}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Format:</span><span class="info-value">Four-Person Scramble</span></div>
        </div>

        <p class="section-label">YOUR REGISTRATION</p>
        <div style="margin-bottom:20px;">
          ${entryType ? `<div class="info-row"><span class="info-label">Entry:</span><span class="info-value">${entryType === 'group' ? 'Group (4 Players)' : 'Individual'}</span></div>` : ''}
          ${sponsor ? `<div class="info-row"><span class="info-label">Sponsorship:</span><span class="info-value">${sponsor.charAt(0).toUpperCase() + sponsor.slice(1)} Sponsor</span></div>` : ''}
          <div class="info-row"><span class="info-label">Payment:</span><span class="info-value">${payLabel}</span></div>
        </div>

        ${isPAE ? `
        <div class="notice">
          <p><strong>Payment reminder:</strong> You selected Pay at Event. Please bring your payment on tournament day. We accept cash and check.</p>
        </div>` : ''}

        <p class="section-label">WHAT TO BRING</p>
        <div style="margin-bottom:20px;">
          <div class="info-row"><span class="info-label">Clubs &amp; gear:</span><span class="info-value">Your own equipment</span></div>
          <div class="info-row"><span class="info-label">Dress code:</span><span class="info-value">Golf attire required</span></div>
          <div class="info-row"><span class="info-label">Arrival:</span><span class="info-value">Please arrive 30 minutes early</span></div>
        </div>

        <a href="https://greenmileboosters.org/my-account/login" class="btn">VIEW MY REGISTRATION</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions? Email us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Event Registration Confirmation ──────────────────────────────────────────
export function eventConfirmationEmail({ firstName, campaignTitle, campaignType, eventDate, location, ticketQty, shirtSize, gradYear, positions, totalCents, paymentStatus }) {
  const formatDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) : null
  const payLabel = paymentStatus === 'pay_at_event' ? 'Pay at Event' : paymentStatus === 'paid' ? 'Paid' : 'Pending'
  const isPAE = paymentStatus === 'pay_at_event'
  const total = totalCents ? (totalCents / 100) : null
  const dateLabel = formatDate(eventDate)

  const typeLabel = {
    alumni:     'Alumni Game',
    fundraiser: 'Fundraiser Event',
    dinner:     'Fundraiser Dinner',
    other:      'Event',
  }[campaignType] || 'Event'

  const typeIcon = {
    alumni:     '🎓',
    fundraiser: '🎉',
    dinner:     '🍽️',
    other:      '📣',
  }[campaignType] || '🎟️'

  const heroBg = campaignType === 'alumni'
    ? 'linear-gradient(135deg,#0f3d1e 0%,#18532a 100%)'
    : 'linear-gradient(135deg,#0f3d1e 0%,#1f6b35 100%)'

  const hero = `
    <div style="background:${heroBg};padding:28px 28px 24px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">${typeIcon}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;line-height:1.15;margin-bottom:8px;">${esc(campaignTitle)}</div>
      ${dateLabel ? `<div style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:99px;padding:5px 18px;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;">${dateLabel}</span>
      </div>` : ''}
    </div>`

  return {
    subject: `Registration Confirmed — ${esc(campaignTitle)}`,
    html: wrap({
      title: `${typeLabel} Registration`,
      preheader: `You're registered for ${esc(campaignTitle)}. We'll see you there!`,
      hero,
      body: `
        <h1>You're Registered! ${typeIcon}</h1>
        <p>Hi <strong>${esc(firstName)}</strong>, your registration for <strong>${esc(campaignTitle)}</strong> has been received. We're excited to see you there!</p>

        ${total ? `
        <div class="stat-box">
          <p class="stat-box-label">Registration Total</p>
          <p class="stat-box-value">$${total.toFixed(0)}</p>
          <p class="stat-box-sub">${payLabel}</p>
        </div>` : ''}

        <p class="section-label">EVENT DETAILS</p>
        <div style="margin-bottom:20px;">
          <div class="info-row"><span class="info-label">Event:</span><span class="info-value">${esc(campaignTitle)}</span></div>
          ${dateLabel ? `<div class="info-row"><span class="info-label">Date:</span><span class="info-value">${dateLabel}</span></div>` : ''}
          ${location ? `<div class="info-row"><span class="info-label">Location:</span><span class="info-value">${esc(location)}</span></div>` : ''}
        </div>

        <p class="section-label">YOUR REGISTRATION</p>
        <div style="margin-bottom:20px;">
          ${ticketQty > 1 ? `<div class="info-row"><span class="info-label">Tickets:</span><span class="info-value">${ticketQty}</span></div>` : ''}
          ${shirtSize ? `<div class="info-row"><span class="info-label">Shirt Size:</span><span class="info-value">${esc(shirtSize)}</span></div>` : ''}
          ${gradYear ? `<div class="info-row"><span class="info-label">Grad Year:</span><span class="info-value">${esc(gradYear)}</span></div>` : ''}
          ${positions ? `<div class="info-row"><span class="info-label">Position(s):</span><span class="info-value">${(() => { try { return JSON.parse(positions).join(', ') } catch { return positions } })()}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Payment:</span><span class="info-value">${payLabel}</span></div>
        </div>

        ${isPAE ? `
        <div class="notice">
          <p><strong>Payment reminder:</strong> You selected Pay at Event. Please bring your payment on the day of the event. We accept cash and check.</p>
        </div>` : ''}

        <a href="https://greenmileboosters.org/my-account/registrations" class="btn">VIEW MY REGISTRATIONS</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions? Email us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Donation Acknowledgment ───────────────────────────────────────────────────
export function donationAckEmail({ firstName, lastName, amount, tierLabel, donationDate }) {
  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
  const amountNum = amount ? parseFloat(amount) : null
  const amountStr = amountNum ? `$${amountNum.toFixed(0)}` : null

  const hero = `
    <div style="background:linear-gradient(135deg,#0f3d1e 0%,#18532a 100%);padding:28px 28px 24px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">💚</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Thank You!</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;">Dinuba Emperors Football</div>
    </div>`

  return {
    subject: `Thank You for Your Support — The Green Mile Boosters`,
    html: wrap({
      title: 'Thank You!',
      preheader: `Your donation to The Green Mile Boosters has been received. Every dollar makes a difference.`,
      hero,
      body: `
        <h1>Thank You, ${esc(firstName)}! 💚</h1>
        <p>Your generous support means the world to our players and coaches. Donations like yours keep Dinuba Emperors Football strong under the Friday night lights.</p>

        ${amountStr ? `
        <div class="stat-box">
          <p class="stat-box-label">Your Donation</p>
          <p class="stat-box-value">${amountStr}</p>
          <p class="stat-box-sub">${formatDate(donationDate)}${tierLabel ? ` &middot; ${esc(tierLabel)}` : ''}</p>
        </div>` : ''}

        <p class="section-label">DONATION SUMMARY</p>
        <div style="margin-bottom:20px;">
          <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${esc(firstName)} ${esc(lastName)}</span></div>
          <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${formatDate(donationDate)}</span></div>
          ${amountStr ? `<div class="info-row"><span class="info-label">Amount:</span><span class="info-value">${amountStr}</span></div>` : ''}
          ${tierLabel ? `<div class="info-row"><span class="info-label">Tier:</span><span class="info-value">${esc(tierLabel)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Organization:</span><span class="info-value">The Green Mile Boosters</span></div>
        </div>

        <div class="impact-bar">
          <p class="impact-bar-title">Your Impact</p>
          <p>Every dollar you donate goes directly to Emperors Football — equipment, travel, meals, and development for student-athletes right here in Dinuba. You're not just supporting a team, you're building a community.</p>
        </div>

        <div class="impact-bar" style="margin-top:0;">
          <p class="impact-bar-title">Tax Information</p>
          <p>The Green Mile Boosters is a 501(c)(3) nonprofit organization. No goods or services were provided in exchange for this contribution. Please retain this email for your records.</p>
        </div>

        <a href="https://greenmileboosters.org/events" class="btn">SEE UPCOMING EVENTS</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions? Email us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ─── Store / Shop emails ────────────────────────────────────────────────────

function fmtMoney(cents) { return `$${(cents / 100).toFixed(2)}` }

function orderItemsTable(items) {
  return items.map(i => `
    <div class="info-row">
      <span class="info-label">${esc(i.product_name)}${i.size ? ` · ${esc(i.size)}` : ''}${i.color ? ` · ${esc(i.color)}` : ''} × ${parseInt(i.quantity, 10) || 0}</span>
      <span class="info-value">${fmtMoney(i.unit_price_cents * i.quantity)}</span>
    </div>`).join('')
}

export function orderConfirmationEmail({ order, items }) {
  const hero = `
    <div style="background:linear-gradient(135deg,#18532a,#0f3a1c);padding:36px 32px;text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:8px;">🛍️</div>
      <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;">ORDER CONFIRMED</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.7);margin-top:6px;">${esc(order.order_number)}</div>
    </div>`

  const fulfillmentNote = order.fulfillment === 'ship'
    ? "Your order will be shipped via USPS. You'll receive a tracking number once it ships."
    : order.fulfillment === 'delivery'
    ? "Your order will be delivered locally. We'll contact you to arrange delivery."
    : "Your order will be ready for pickup at our next game or at school. We'll reach out with details."

  return wrap({
    title: `Order Confirmed — ${esc(order.order_number)}`,
    preheader: `Thanks for your order! ${esc(order.order_number)} is confirmed.`,
    hero,
    body: `
      <h1>Thanks, ${esc((order.name || '').split(' ')[0])}!</h1>
      <p>Your order has been received and confirmed. Here's your summary:</p>

      <div class="section-label">Order Items</div>
      ${orderItemsTable(items)}
      <div class="divider"></div>
      <div class="info-row"><span class="info-label">Subtotal</span><span class="info-value">${fmtMoney(order.subtotal_cents)}</span></div>
      ${order.shipping_cents > 0 ? `<div class="info-row"><span class="info-label">Shipping</span><span class="info-value">${fmtMoney(order.shipping_cents)}</span></div>` : ''}
      <div class="info-row"><span class="info-label" style="font-weight:700;color:#111827;">Total</span><span class="info-value" style="font-weight:700;color:#18532a;">${fmtMoney(order.total_cents)}</span></div>
      <div class="divider"></div>
      <div class="section-label">Fulfillment</div>
      <p>${fulfillmentNote}</p>
      <div class="section-label">Payment</div>
      <p>${order.payment_method === 'stripe' ? '✅ Paid by card' : '💵 Cash — due at ' + (order.fulfillment === 'pickup' ? 'pickup' : 'delivery')}</p>
      <div class="divider"></div>
      <p style="font-size:13px;color:#6b7280;">Questions? Reply to this email or contact us at <a href="mailto:info@greenmileboosters.org" style="color:#18532a;">info@greenmileboosters.org</a>.</p>
    `,
  })
}

export function orderAdminAlertEmail({ order, items }) {
  const hero = `
    <div style="background:linear-gradient(135deg,#1c1c1c,#2d2d2d);padding:28px 32px;text-align:center;">
      <div style="font-size:2rem;margin-bottom:6px;">🛒</div>
      <div style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#fff;letter-spacing:2px;">NEW SHOP ORDER</div>
      <div style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">${esc(order.order_number)}</div>
    </div>`
  return wrap({
    title: `New Shop Order — ${esc(order.order_number)}`,
    preheader: `${esc(order.name)} placed an order for ${fmtMoney(order.total_cents)}`,
    hero,
    body: `
      <h1>New Order Received</h1>
      <div class="section-label">Customer</div>
      <div class="info-row"><span class="info-label">Name</span><span class="info-value">${esc(order.name)}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${esc(order.email)}</span></div>
      ${order.phone ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-value">${esc(order.phone)}</span></div>` : ''}
      <div class="section-label">Items</div>
      ${orderItemsTable(items)}
      <div class="divider"></div>
      <div class="info-row"><span class="info-label" style="font-weight:700;">Total</span><span class="info-value" style="font-weight:700;color:#18532a;">${fmtMoney(order.total_cents)}</span></div>
      <div class="section-label">Fulfillment</div>
      <div class="info-row"><span class="info-label">Method</span><span class="info-value">${order.fulfillment.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Payment</span><span class="info-value">${order.payment_method === 'stripe' ? '✅ Paid (Card)' : '⏳ Cash pending'}</span></div>
      <a href="https://greenmileboosters.org/admin/store" class="btn">VIEW IN ADMIN</a>
    `,
  })
}

export function orderShippedEmail({ order, items, tracking }) {
  const hero = `
    <div style="background:linear-gradient(135deg,#18532a,#0f3a1c);padding:36px 32px;text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:8px;">📦</div>
      <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;">YOUR ORDER SHIPPED</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.7);margin-top:6px;">${esc(order.order_number)}</div>
    </div>`
  return wrap({
    title: `Your Order Shipped — ${esc(order.order_number)}`,
    preheader: 'Your Green Mile Boosters order is on its way!',
    hero,
    body: `
      <h1>It's on its way!</h1>
      <p>Your order has shipped via USPS.</p>
      <div class="stat-box">
        <p class="stat-box-label">Tracking Number</p>
        <p class="stat-box-value" style="font-size:20px;letter-spacing:2px;">${esc(tracking)}</p>
        <p class="stat-box-sub"><a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=${esc(tracking)}" style="color:#18532a;">Track on USPS →</a></p>
      </div>
      <div class="section-label">Items Shipped</div>
      ${orderItemsTable(items)}
      <div class="divider"></div>
      <p style="font-size:13px;color:#6b7280;">Questions? <a href="mailto:info@greenmileboosters.org" style="color:#18532a;">info@greenmileboosters.org</a></p>
    `,
  })
}

export function orderReadyPickupEmail({ order, items }) {
  const hero = `
    <div style="background:linear-gradient(135deg,#18532a,#0f3a1c);padding:36px 32px;text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:8px;">✅</div>
      <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;">READY FOR PICKUP</div>
    </div>`
  return wrap({
    title: `Ready for Pickup — ${esc(order.order_number)}`,
    preheader: 'Your Green Mile Boosters order is ready!',
    hero,
    body: `
      <h1>Your order is ready!</h1>
      <p>Come pick up your order at the next Emperors home game or at school.</p>
      ${order.payment_method === 'cash' ? '<p><strong>💵 Remember:</strong> Cash payment is due at pickup.</p>' : ''}
      <div class="section-label">Your Items</div>
      ${orderItemsTable(items)}
    `,
  })
}

export function orderRefundedEmail({ order }) {
  const hero = `
    <div style="background:linear-gradient(135deg,#374151,#1f2937);padding:36px 32px;text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:8px;">↩️</div>
      <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;">REFUND PROCESSED</div>
    </div>`
  return wrap({
    title: `Refund Processed — ${esc(order.order_number)}`,
    preheader: `Your refund of ${fmtMoney(order.total_cents)} has been processed.`,
    hero,
    body: `
      <h1>Refund Confirmed</h1>
      <p>Your refund of <strong>${fmtMoney(order.total_cents)}</strong> for order ${esc(order.order_number)} has been processed.
      ${order.payment_method === 'stripe' ? 'Please allow 5–10 business days for the credit to appear.' : 'Please contact us to arrange your cash refund.'}</p>
      <div class="divider"></div>
      <p style="font-size:13px;color:#6b7280;"><a href="mailto:info@greenmileboosters.org" style="color:#18532a;">info@greenmileboosters.org</a></p>
    `,
  })
}

// ── Shared date helper ──────────────────────────────────────────────────────
function longDate(d) {
  if (!d) return null
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) }
  catch { return null }
}
function payLabelFor(status) {
  return status === 'pay_at_event' ? 'Pay at Event'
    : status === 'paid'   ? 'Paid'
    : status === 'free'   ? 'Complimentary'
    : status === 'waived' ? 'Waived'
    : 'Pending'
}

// ── Country Nights — Dinner / Event Ticket Confirmation ─────────────────────
// The Green Mile Boosters' signature tri-tip dinner & auction fundraiser.
export function countryNightsEmail({ firstName, ticketQty, totalCents, paymentStatus, eventDate, location, doors, dinner, highlights }) {
  const dateLabel = longDate(eventDate)
  const payLabel  = payLabelFor(paymentStatus)
  const isPAE     = paymentStatus === 'pay_at_event'
  const total     = totalCents ? (totalCents / 100) : null
  const qty       = Math.max(1, parseInt(ticketQty, 10) || 1)

  const highlightRows = Array.isArray(highlights) && highlights.length
    ? highlights.map(h => `<li style="margin:0 0 6px;padding-left:6px;">${esc(h)}</li>`).join('')
    : ''

  const hero = `
    <div style="background:linear-gradient(135deg,#0f3d1e 0%,#18532a 100%);padding:30px 28px 26px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">🤠</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Country Nights</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:10px;">On the Green Mile</div>
      ${dateLabel ? `<div style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:99px;padding:5px 18px;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:rgba(255,255,255,0.85);letter-spacing:2px;text-transform:uppercase;">${dateLabel}</span>
      </div>` : ''}
    </div>`

  return {
    subject: `You're Going to Country Nights! 🤠`,
    html: wrap({
      title: 'Country Nights — Tickets Confirmed',
      preheader: `Your Country Nights tickets are confirmed. See you on the Green Mile!`,
      hero,
      body: `
        <h1>See You There, ${esc(firstName)}! 🤠</h1>
        <p>Your ${qty > 1 ? `<strong>${qty} tickets</strong> are` : 'ticket is'} confirmed for <strong>Country Nights</strong> — a night of tri-tip, live music, and auctions, all to back Dinuba Emperors Football. Boots optional, big hearts required.</p>

        ${total ? `
        <div class="stat-box">
          <p class="stat-box-label">${qty > 1 ? `${qty} Tickets` : 'Ticket'} · Total</p>
          <p class="stat-box-value">$${total.toFixed(0)}</p>
          <p class="stat-box-sub">${payLabel}</p>
        </div>` : ''}

        <p class="section-label">EVENT DETAILS</p>
        <div style="margin-bottom:20px;">
          ${dateLabel ? `<div class="info-row"><span class="info-label">Date:</span><span class="info-value">${dateLabel}</span></div>` : ''}
          ${doors ? `<div class="info-row"><span class="info-label">Doors:</span><span class="info-value">${esc(doors)}</span></div>` : ''}
          ${dinner ? `<div class="info-row"><span class="info-label">Dinner:</span><span class="info-value">${esc(dinner)}</span></div>` : ''}
          ${location ? `<div class="info-row"><span class="info-label">Location:</span><span class="info-value">${esc(location)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Tickets:</span><span class="info-value">${qty}</span></div>
          <div class="info-row"><span class="info-label">Payment:</span><span class="info-value">${payLabel}</span></div>
        </div>

        ${highlightRows ? `
        <div class="impact-bar">
          <p class="impact-bar-title">The Night Includes</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:1.65;">${highlightRows}</ul>
        </div>` : ''}

        ${isPAE ? `
        <div class="notice">
          <p><strong>Payment reminder:</strong> You selected Pay at Event. Please bring your payment the night of Country Nights. We accept cash and check.</p>
        </div>` : ''}

        <a href="https://greenmileboosters.org/my-account/registrations" class="btn">VIEW MY TICKETS</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions? Email us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Country Nights Raffle — Ticket Confirmation ─────────────────────────────
export function raffleTicketEmail({ firstName, ticketQty, totalCents, paymentStatus, eventDate, location, prizes, needNotBePresent }) {
  const dateLabel = longDate(eventDate)
  const payLabel  = payLabelFor(paymentStatus)
  const isPAE     = paymentStatus === 'pay_at_event'
  const total     = totalCents ? (totalCents / 100) : null
  const qty       = Math.max(1, parseInt(ticketQty, 10) || 1)

  const prizeRows = Array.isArray(prizes) && prizes.length
    ? prizes.map(p => `<div class="info-row"><span class="info-label">${esc(p.label)}:</span><span class="info-value">$${((parseInt(p.amount, 10) || 0) / 100).toLocaleString()}</span></div>`).join('')
    : ''

  const hero = `
    <div style="background:linear-gradient(135deg,#0f3d1e 0%,#18532a 100%);padding:30px 28px 26px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">🎟️</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Country Nights Raffle</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2.5px;text-transform:uppercase;">You're In the Draw</div>
    </div>`

  return {
    subject: `You're In the Raffle! 🎟️ — Country Nights`,
    html: wrap({
      title: 'Country Nights Raffle — Entry Confirmed',
      preheader: `Your Country Nights raffle ${qty > 1 ? 'tickets are' : 'ticket is'} confirmed. Good luck!`,
      hero,
      body: `
        <h1>Good Luck, ${esc(firstName)}! 🍀</h1>
        <p>You're officially entered in the <strong>Country Nights Raffle</strong>. ${qty > 1 ? `That's <strong>${qty} chances</strong>` : `That's <strong>1 entry</strong>`} to win — and every ticket helps send Dinuba Emperors Football onto the field.</p>

        <div class="stat-box">
          <p class="stat-box-label">${qty > 1 ? 'Raffle Tickets' : 'Raffle Ticket'}</p>
          <p class="stat-box-value">${qty}</p>
          ${total ? `<p class="stat-box-sub">$${total.toFixed(0)} · ${payLabel}</p>` : `<p class="stat-box-sub">${payLabel}</p>`}
        </div>

        ${prizeRows ? `
        <p class="section-label">PRIZES</p>
        <div style="margin-bottom:20px;">${prizeRows}</div>` : ''}

        <p class="section-label">THE DRAWING</p>
        <div style="margin-bottom:20px;">
          ${dateLabel ? `<div class="info-row"><span class="info-label">Drawn:</span><span class="info-value">${dateLabel}</span></div>` : ''}
          ${location ? `<div class="info-row"><span class="info-label">At:</span><span class="info-value">${esc(location)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Entries:</span><span class="info-value">${qty}</span></div>
          <div class="info-row"><span class="info-label">Payment:</span><span class="info-value">${payLabel}</span></div>
        </div>

        <div class="impact-bar">
          <p class="impact-bar-title">Good to Know</p>
          <p>${needNotBePresent ? 'You do <strong>not</strong> need to be present to win — we\'ll reach out directly if your number is drawn.' : 'Winners are drawn the night of Country Nights.'} Winners are contacted at the email and phone on file.</p>
        </div>

        ${isPAE ? `
        <div class="notice">
          <p><strong>Payment reminder:</strong> You selected Pay at Event. Please bring your payment the night of Country Nights. We accept cash and check.</p>
        </div>` : ''}

        <a href="https://greenmileboosters.org/my-account/registrations" class="btn">VIEW MY ENTRIES</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions? Email us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Team Dinner Host Confirmation ───────────────────────────────────────────
// Sent when a parent signs up to host the Thursday team dinner before a game.
export function teamDinnerEmail({ firstName, opponent, dinnerDate, gameDate, address, notes }) {
  const dinnerLabel = longDate(dinnerDate)
  const gameLabel   = longDate(gameDate)

  const hero = `
    <div style="background:linear-gradient(135deg,#0f3d1e 0%,#18532a 100%);padding:30px 28px 26px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">🍽️</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">You're Hosting!</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2.5px;text-transform:uppercase;">Emperor Football Team Dinner</div>
    </div>`

  return {
    subject: `You're Hosting the Team Dinner${opponent ? ` — ${opponent} Week` : ''}! 🍽️`,
    html: wrap({
      title: 'Team Dinner — You\'re Hosting',
      preheader: `Thank you for hosting the Emperor Football team dinner${dinnerLabel ? ` on ${dinnerLabel}` : ''}!`,
      hero,
      body: `
        <h1>Thank You, ${esc(firstName || 'Emperor Family')}! 🏈</h1>
        <p>You're signed up to host an <strong>Emperor Football team dinner</strong> — the night before the boys take the field. These dinners are where the brotherhood is built. On behalf of the whole program, thank you.</p>

        <p class="section-label">YOUR DINNER</p>
        <div style="margin-bottom:20px;">
          ${dinnerLabel ? `<div class="info-row"><span class="info-label">Dinner (Thu):</span><span class="info-value">${dinnerLabel}</span></div>` : ''}
          ${opponent ? `<div class="info-row"><span class="info-label">Game vs:</span><span class="info-value">${esc(opponent)}</span></div>` : ''}
          ${gameLabel ? `<div class="info-row"><span class="info-label">Game (Fri):</span><span class="info-value">${gameLabel}</span></div>` : ''}
          ${address ? `<div class="info-row"><span class="info-label">Address:</span><span class="info-value">${esc(address)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Providing:</span><span class="info-value">Food, Drinks &amp; Desserts</span></div>
        </div>

        ${notes ? `<div class="notice"><p><strong>Your note:</strong> ${esc(notes)}</p></div>` : ''}

        <div class="impact-bar">
          <p class="impact-bar-title">Good to Know</p>
          <p>Hosting means providing <strong>food, drinks, and desserts</strong> for <strong>25&ndash;50 athletes and coaches</strong>. Plan your menu and rally a few other families to pitch in. Questions? We're here to help.</p>
        </div>

        <a href="https://greenmileboosters.org/parents" class="btn">VIEW THE DINNER CALENDAR</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Need to make a change? Contact us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>. Together we are Emperor Football.</p>
      `
    })
  }
}

// ── Account Welcome / Registration Email ────────────────────────────────────
// Sent when someone creates an email+password account with The Green Mile Boosters.
export function accountWelcomeEmail({ firstName, email }) {
  const hero = `
    <div style="background:linear-gradient(135deg,#0f3d1e 0%,#18532a 100%);padding:28px 28px 24px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">🏈</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;">Welcome to the Green Mile</div>
    </div>`

  return {
    subject: `Welcome to The Green Mile Boosters`,
    html: wrap({
      title: 'Welcome to The Green Mile Boosters',
      preheader: `Your account is ready. Welcome to the Green Mile family.`,
      hero,
      body: `
        <h1>Welcome Aboard, ${esc(firstName)}! 🏈</h1>
        <p>Your account with <strong>The Green Mile Boosters</strong> is all set up. You're now part of the crew backing Dinuba Emperors Football under the Friday night lights.</p>

        <p>Sign in anytime with your email${email ? ` (<strong>${esc(email)}</strong>)` : ''} and the password you chose to:</p>

        <div class="impact-bar">
          <p class="impact-bar-title">Your Account</p>
          <p>&#8226; View and manage your event registrations<br/>&#8226; Grab tickets and raffle entries for upcoming events<br/>&#8226; Keep your info current for receipts and reminders</p>
        </div>

        <a href="https://greenmileboosters.org/my-account/login" class="btn">SIGN IN TO MY ACCOUNT</a>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">If you did not create this account, contact us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Forgot Password / Reset Email ───────────────────────────────────────────
export function passwordResetEmail({ firstName, resetUrl }) {
  const hero = `
    <div style="background:linear-gradient(135deg,#0f3d1e 0%,#18532a 100%);padding:28px 28px 24px;text-align:center;">
      <div style="font-size:44px;line-height:1;margin-bottom:10px;">🔒</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;">Reset Your Password</div>
    </div>`

  return {
    subject: `Reset Your Password — The Green Mile Boosters`,
    html: wrap({
      title: 'Reset Your Password',
      preheader: `Reset your The Green Mile Boosters password. This link expires in 1 hour.`,
      hero,
      body: `
        <h1>Reset Your Password</h1>
        <p>Hi ${firstName ? esc(firstName) : 'there'}, we received a request to reset the password for your <strong>The Green Mile Boosters</strong> account. Click the button below to choose a new one.</p>

        <a href="${esc(resetUrl)}" class="btn">RESET MY PASSWORD</a>

        <div class="notice">
          <p>This link expires in <strong>1 hour</strong> and can only be used once. If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${esc(resetUrl)}" style="color:${BASE.green};word-break:break-all;">${esc(resetUrl)}</a></p>
        </div>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">If you didn't ask to reset your password, you can safely ignore this email — your password won't change. For help, contact <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}

// ── Receipt / Invoice Email ─────────────────────────────────────────────────
// General-purpose payment receipt for any card charge (tickets, raffle,
// donations, sponsorships). `lineItems` = [{ label, amountCents }].
export function receiptEmail({ firstName, receiptNumber, description, lineItems, subtotalCents, feeCents, totalCents, paymentDate, last4, paymentMethod = 'card' }) {
  const dateLabel = paymentDate
    ? (() => { try { return new Date(paymentDate).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) } catch { return new Date(paymentDate).toDateString?.() || '' } })()
    : ''

  const items = Array.isArray(lineItems) && lineItems.length
    ? lineItems
    : (description ? [{ label: description, amountCents: subtotalCents ?? totalCents }] : [])

  const itemRows = items.map(i =>
    `<div class="info-row"><span class="info-label">${esc(i.label)}</span><span class="info-value">${fmtMoney(parseInt(i.amountCents, 10) || 0)}</span></div>`
  ).join('')

  const hero = `
    <div style="background:#0f3d1e;padding:24px 28px;text-align:center;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;">Payment Receipt</div>
      ${receiptNumber ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:2px;margin-top:5px;">${esc(receiptNumber)}</div>` : ''}
    </div>`

  return {
    subject: `Your Receipt${receiptNumber ? ` — ${receiptNumber}` : ''} — The Green Mile Boosters`,
    html: wrap({
      title: 'Payment Receipt',
      preheader: `Your receipt from The Green Mile Boosters${totalCents ? ` for ${fmtMoney(totalCents)}` : ''}.`,
      hero,
      body: `
        <h1>Thanks, ${esc(firstName || 'friend')}!</h1>
        <p>Here's your receipt from <strong>The Green Mile Boosters</strong>. Please keep this email for your records.</p>

        ${totalCents ? `
        <div class="stat-box">
          <p class="stat-box-label">Amount Paid</p>
          <p class="stat-box-value">${fmtMoney(totalCents)}</p>
          <p class="stat-box-sub">${dateLabel}${last4 ? ` · Card ending ${esc(String(last4))}` : ''}</p>
        </div>` : ''}

        <p class="section-label">RECEIPT</p>
        <div style="margin-bottom:8px;">
          ${itemRows}
          ${feeCents ? `<div class="info-row"><span class="info-label">Processing Fee</span><span class="info-value">${fmtMoney(feeCents)}</span></div>` : ''}
        </div>
        <div class="divider"></div>
        <div class="info-row"><span class="info-label" style="font-weight:700;color:#111827;">Total Paid</span><span class="info-value" style="font-weight:700;color:${BASE.green};">${fmtMoney(totalCents || 0)}</span></div>

        <p class="section-label" style="margin-top:22px;">DETAILS</p>
        <div style="margin-bottom:20px;">
          ${receiptNumber ? `<div class="info-row"><span class="info-label">Receipt #:</span><span class="info-value">${esc(receiptNumber)}</span></div>` : ''}
          ${dateLabel ? `<div class="info-row"><span class="info-label">Date:</span><span class="info-value">${dateLabel}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Method:</span><span class="info-value">${paymentMethod === 'card' ? `Card${last4 ? ` ending ${esc(String(last4))}` : ''}` : esc(String(paymentMethod))}</span></div>
          <div class="info-row"><span class="info-label">Paid To:</span><span class="info-value">The Green Mile Boosters</span></div>
        </div>

        <div class="impact-bar">
          <p class="impact-bar-title">Tax Information</p>
          <p>The Green Mile Boosters is a registered 501(c)(3) nonprofit (EIN 92-2360865). Please retain this receipt for your records.</p>
        </div>

        <div class="divider"></div>
        <p style="font-size:13px;color:${BASE.gray};">Questions about this charge? Contact us at <a href="mailto:info@greenmileboosters.org" style="color:${BASE.green};">info@greenmileboosters.org</a>.</p>
      `
    })
  }
}
