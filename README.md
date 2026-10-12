# C + D Architectural Design Services

A minimal, responsive website promoting architectural design services, with a guided client project brief.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://127.0.0.1:5173). On Windows, you can also double-click `RUN-WEBSITE.bat`.

## Features

- Responsive marketing homepage and service overview
- Architectural inspiration gallery with accessible image lightbox
- FAQ and configurable contact / social links
- Guided client inquiry with lot dimensions, site conditions, requested rooms, design preferences, budget, timing, attachments, and final review
- Privacy notice
- Local-only demo inbox for testing; demo submissions are not emailed
- Cloudflare Pages Functions + D1/R2 submission backend scaffolding for production setup

## Project notes

See [FUNCTION-AUDIT.md](./FUNCTION-AUDIT.md) for what is implemented and what still needs business details or configuration. Populate `public/site-config.js` only with contact details approved by Ressian. Do not commit passwords, API keys, or real customer data.

## Before launch

Configure Cloudflare D1 and R2, the notification email and Resend secret before accepting real public inquiries. Replace inspiration references with approved completed-project imagery only when available. Review the privacy notice for the actual business and data retention practices.

The local preview was packaged and basic syntax/path checks were run. Verify `npm install`, `npm run build`, and real form submission in your environment before production launch.
