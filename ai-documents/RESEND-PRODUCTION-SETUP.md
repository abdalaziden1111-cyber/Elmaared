# Resend production setup — checklist

This is a one-time setup that flips outbound mail from the Resend sandbox
(`onboarding@resend.dev`, which only delivers to the account owner) to a
verified production sender.

The automation is in [`scripts/setup-resend-domain.mjs`](../scripts/setup-resend-domain.mjs);
this document is the human-facing handoff that ties the script to the DNS
work you do at your registrar.

## Prerequisites

- A domain you control DNS for (e.g., `app-exhibition.sa`).
- `RESEND_API_KEY` set in `.env.local`. Already done.
- Decision: register the apex (`app-exhibition.sa`) or a subdomain
  (`mail.app-exhibition.sa`). Subdomain is safer if the apex already
  receives or sends mail today — it isolates Resend reputation.

## Steps

### 1. Register the domain at Resend

```bash
pnpm mail:setup -- --domain app-exhibition.sa
```

The script will:

- POST `/domains` if the domain isn't registered yet.
- Print the DNS records you need to publish — SPF (TXT), DKIM (3× CNAME),
  MX (return-path), and a recommended DMARC TXT.
- Trigger `/domains/:id/verify` once (will likely fail the first time —
  DNS hasn't propagated yet).

### 2. Publish DNS records at your registrar

Copy each row from the printed table into your DNS provider's UI. Most
modern registrars (Cloudflare, Route53, Namecheap, GoDaddy, Hostinger,
domain.sa) accept `CNAME` and `TXT` directly; if your provider auto-suffixes
the domain (e.g., Cloudflare turns `mail.app-exhibition.sa` into
`mail.app-exhibition.sa.app-exhibition.sa`), enter only the leftmost label.

Records to expect:

| Type   | Name (host)                                  | Purpose                          |
| ------ | -------------------------------------------- | -------------------------------- |
| TXT    | `send.<domain>` or apex                      | SPF — allows Resend to send      |
| CNAME  | `resend._domainkey.<domain>`                 | DKIM #1                          |
| CNAME  | `resend2._domainkey.<domain>` (some regions) | DKIM #2                          |
| CNAME  | `resend3._domainkey.<domain>` (some regions) | DKIM #3                          |
| MX     | `send.<domain>`                              | Return-path bounces              |
| TXT    | `_dmarc.<domain>`                            | DMARC — start at `p=none`        |

### 3. Re-verify

After publishing (usually 5–60 min for propagation):

```bash
pnpm mail:setup -- --domain app-exhibition.sa
```

The script re-calls verify. Once Resend's check passes, status flips to
`verified`.

### 4. Update env

Once verified, set:

- `.env.local`:

  ```
  RESEND_FROM_EMAIL=noreply@app-exhibition.sa
  ```

- Vercel project env (Production + Preview): same value.

Restart `next dev` (or redeploy) so the new FROM is picked up.

### 5. Smoke-test deliverability

Send one real email to a third address (Gmail or Outlook account you own
that is not the Resend account-owner email). The simplest path is a
one-off Node script:

```javascript
import { sendEmail } from '../lib/email/resend.js';
await sendEmail({
  to: 'you@gmail.com',
  subject: 'Resend prod smoke test',
  html: '<p>If you see this, DKIM and SPF are passing.</p>',
});
```

Open the message in Gmail → 3-dot menu → "Show original". You want:

```
Authentication-Results:  mx.google.com;
       dkim=pass header.i=@app-exhibition.sa
       spf=pass smtp.mailfrom=send.app-exhibition.sa
       dmarc=pass policy.dmarc=none
```

All three `pass` = production is live.

## DMARC tightening (2 weeks later)

Start at `p=none` (monitoring only) so you don't reject legitimate
forwards on day 1. After 2 weeks of clean reports at the `rua=`
address, tighten to `p=quarantine`. Another 2 weeks clean, then
`p=reject` if you're confident.

Quarantine = receivers send failing mail to spam.
Reject = receivers drop it outright.

## What this closes

Audit-tracker item **P1-2** (Resend production domain + DKIM).
Item 4 ("send test email") above is the final acceptance criterion.
