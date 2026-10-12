# C + D Architectural Design Services

The website source is now committed in the `cd-architectural-design-services/` folder.

## Run locally

1. Open or clone this repository.
2. Open a terminal in `cd-architectural-design-services/`.
3. Run:

   ```bash
   npm install
   npm run dev
   ```

   Or, on Windows, double-click `cd-architectural-design-services/RUN-WEBSITE.bat`.

4. Visit `http://127.0.0.1:5173` if the browser does not open automatically.

## What is included

- Responsive architectural services landing page and FAQ
- Image reference gallery
- Guided multi-step client project brief with lot/site measurements, room requirements, design references, budget, timeline, attachments, review, and consent
- Privacy-notice page
- Local-only demo inquiry inbox
- Cloudflare Pages Functions, D1/R2 configuration template, and production form-submission scaffolding
- Function checklist and deployment instructions in the project's own README

## Deployment

When connecting the repository to Cloudflare Pages, set the **Root directory** to `cd-architectural-design-services`. Configure D1, R2, and Resend using the instructions in that folder's README before accepting real inquiries.

The project folder and its local run steps are documented in the nested README. Local demo form submissions are not sent to Ressian. Never commit customer inquiry data or API secrets.
