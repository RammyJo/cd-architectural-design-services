# C + D Architectural Design Services

A responsive architectural-services website with a minimal marketing homepage, service descriptions, design-reference gallery, FAQ, configurable contact links, privacy notice, and a guided client project brief.

## Run it like the canteen project

**You only need Node.js installed.** Extract this folder, open a terminal inside it, then run:

```bash
npm install
npm run dev
```

Vite opens the website in your browser. If it doesn't open automatically, visit **http://127.0.0.1:5173**.

On Windows, you can instead double-click **`RUN-WEBSITE.bat`**. It installs the dependencies the first time and starts the site for you. Keep the black terminal window open while using the site.

#See [FUNCTION-AUDIT.md](./FUNCTION-AUDIT.md) for the full checklist of what is included, newly added, and still requires real business details or service configuration.

## Included functions

- Responsive homepage with service descriptions, design directions, project process, FAQ, and clear inquiry calls to action.
- Design-reference gallery with keyboard-accessible image enlargement. Images are explicitly described as inspiration references, not verified C + D projects.
- Configurable public contact links for email, phone, WhatsApp, Facebook, Instagram, service area, address, and optional appointment-booking URL.
- Five-step client brief: contact/project type, site measurements and conditions, room requirements, preferences/budget/timeline, then a review-and-edit screen before consent and submission.
- Multiple JPG/PNG/WEBP/PDF uploads (up to 12 files, 10 MB combined), file validation, status feedback, honeypot, and server-side size/type checks.
- Session draft saving with a clear-draft control. Browser drafts do not persist uploaded files; those must be re-attached after a refresh.
- Privacy-notice page, page descriptions, open-graph metadata, structured service data, skip links, and reduced-motion support.
- Local-only demo inbox and a production Cloudflare Pages Functions / D1 / R2 / optional Resend submission path.

## Add verified business contact details

Open `public/site-config.js` and fill in only details that Ressian has approved for public use. Use a complete `https://` URL for Facebook and Instagram. Leave values blank when a channel should not be shown. The contact section hides channels that have not been configured.

## Try the client inquiry form

Click **Start your project brief**, fill in the steps, review the summary, and submit. During local development the website saves test inquiries to:

- `.local-data/inquiries.json` — client form details, newest inquiry first
- `.local-data/uploads/` — inspiration images, drawings, and PDFs uploaded in local tests

Those files stay on this computer and are excluded from Git. The success message explicitly says this is a local demo. Local test submissions **are not sent to Ressian or emailed to anyone**.

## Publish it later

The normal `npm run dev` command is intentionally simple and does not require a Cloudflare database to preview the website. The real Cloudflare Pages submission backend is still included in `functions/api/submit.js`.

For a real public site, configure Cloudflare D1 and R2 in `wrangler.jsonc`, set the business notification email, configure a Resend API key for email notifications, then use `npm run deploy`. Detailed deployment steps are below in the [Cloudflare setup section](#cloudflare-pages-setup). Do not deploy with placeholder database IDs or contact details.

### Build check

```bash
npm run build
npm run preview
```

## Files

- `public/index.html` — marketing homepage, service overview, FAQ, design references, and contact section
- `public/project-brief.html` — guided client inquiry, upload, review, and consent flow
- `public/privacy.html` — privacy-notice draft for owner review
- `FUNCTION-AUDIT.md` — complete included/missing/needs-configuration feature audit
- `public/site-config.js` — optional verified contact details and service area
- `public/styles.css` — responsive visual design
- `public/site.js` / `public/brief.js` — navigation, gallery, contact display, review, and form behavior
- `vite.config.js` — fast local development and local-only submission inbox
- `functions/api/submit.js` — production Cloudflare Pages submission API
- `schema.sql` — D1 table and indexes
- `wrangler.jsonc` — Cloudflare Pages configuration template

## Cloudflare Pages setup

1. Create a D1 database named `cd-architectural-inquiries` and an R2 bucket with the same name.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the database ID. Confirm the `CD_PROJECTS` and `CD_UPLOADS` bindings match the created resources.
3. Set `NOTIFY_EMAIL` to the business email. Set `FROM_EMAIL` to a sender address on a domain verified in Resend.
4. Install and authenticate Wrangler if needed, then initialize the remote D1 schema:

   ```bash
   npx wrangler login
   npx wrangler d1 execute cd-architectural-inquiries --remote --file=./schema.sql
   ```

5. Create the Pages project if it does not exist:

   ```bash
   npx wrangler pages project create cd-architectural-design-services
   ```

6. Configure the Resend API key as a secret. It must never be placed in frontend JavaScript or committed to Git:

   ```bash
   npx wrangler pages secret put RESEND_API_KEY --project-name cd-architectural-design-services
   ```

7. Deploy:

   ```bash
   npm run deploy
   ```

For a Cloudflare local-runtime preview instead of the easy Vite demo, use `npm run dev:cloudflare` after configuring local/remote bindings as needed.

## Before launching publicly

- Add real built-project case studies, project photos, architect/team bios, licenses/qualifications, testimonials, and project locations only when verified and approved. Do not present the current inspiration imagery as C + D's completed work.
- Fill in `public/site-config.js` with approved email, phone/WhatsApp, social URLs, service area, address, and optional booking URL.
- Verify all advertised services and deliverables with Ressian before publishing.
- Review and finalize `public/privacy.html`, including the actual business identity/contact, configured storage and email services, retention/deletion process, and any legally required privacy details.
- Configure the Cloudflare backend and notification email before receiving real submissions. Test inquiry submission and file uploads, then confirm the record and notification are received.
- A live appointment calendar, interactive map, price estimator, and real portfolio cannot be meaningfully configured until the business provides appointment availability, address/service area, fee rules, and actual completed-project material.
