# C + D Architectural Design Services — Function Audit

This is a practical audit of common features for an architectural-services website. “Included” means the current code contains the function. “Needs owner input” means a real business fact, media asset, or external account must be supplied before the feature can be published honestly or work end-to-end.

## Included before this update

| Function | Status | Notes |
|---|---|---|
| Brand-led home page | Included | Architectural visual direction, headline, navigation, and inquiry calls to action. |
| Service overview | Included | Residential design, renovations/extensions, space planning, and concept consultation; confirm scope with Ressian. |
| Design reference gallery | Included | Visual reference photography is labelled as inspiration, not completed C + D work. |
| How the process begins | Included | Explains the initial brief and discussion steps. |
| Multi-step project inquiry | Included | Captures client contact, type/location, lot dimensions, storeys, rooms, style, budget, timeline, priorities, and notes. |
| Image/PDF uploads | Included | JPG, PNG, WEBP, PDF; up to 12 files and 10 MB total. |
| Local demo submission inbox | Included | Local testing records stay on the computer under `.local-data/`; they are not sent to Ressian. |
| Cloudflare submission backend | Included in code, not yet configured | D1/R2 bindings and optional Resend email notification require real account configuration. |
| Responsive layout and mobile navigation | Included | Mobile-friendly styles and a collapsible navigation menu. |
| Basic accessibility | Included | Skip links, labels, native FAQ disclosures, keyboard-operated reference enlargement, and reduced-motion styling. |

## Added in this update

| Function | Status | Notes |
|---|---|---|
| FAQ section | Added | Answers about preparation, files, services, commitments, permits, and incomplete measurements. |
| Contact section | Added | Supports email, phone, WhatsApp, Facebook, Instagram, booking URL, service area, and address via `public/site-config.js`. Channels remain hidden until configured. |
| Address-to-map link | Added | When an approved address is entered, the page provides an “Open in Google Maps” link. |
| Lightbox for references | Added | Click or keyboard-activate a reference image to enlarge it and view its caption. |
| Five-step client brief | Added | Final review screen summarizes entered values, shows selected uploads, and has Edit buttons for the earlier sections. |
| Clear saved draft | Added | Lets the client reset the form and remove the current browser-session draft. |
| Extra site notes | Added | Clients can describe access, orientation, drainage, slope, views, trees, or known restrictions. |
| Validation refinement | Added | Filled optional inputs such as numeric measurements are also checked for invalid values. |
| Privacy notice page | Added as a draft | Must be reviewed against the real business identity, storage configuration, retention, and privacy process before launch. |
| Better share/search metadata | Added | Open Graph tags, description tags, and basic structured service data. |
| Attachment drag-and-drop and per-file removal | Added | Clients can drop pegs/references onto the upload area and remove individual files without clearing the entire selection. |
| Upload size summary | Added | Shows selected file count and total size before submission, with a clear 12-file / 10 MB limit. |
| Downloadable reviewed brief | Added | Clients can save a plain-text copy of form answers and attachment names before submitting; the actual attachments are not embedded in the text file. |
| More accessible form progress | Added | Active step is exposed with `aria-current`, the progress bar announces its current percentage, and error states receive keyboard focus. |
| Better mobile legibility | Added | Increased small text sizes, clarified checkbox cards, enlarged interactive targets, and improved upload/review controls for phones. |
| Keyboard-friendly navigation | Added | Mobile navigation closes with Escape, closes after following a link or clicking outside, and resets when the viewport returns to desktop. |
| Image loading fallback | Added | Remote architectural reference images show a designed fallback instead of a blank area if the image host is unavailable. |
| Upload signature checking | Added | Production and local demo endpoints check the file's actual signature for JPG, PNG, WEBP, and PDF, not only the browser-provided MIME label. |
| Inquiry email subject sanitization | Added | Removes line breaks and normalizes whitespace before using the client's name in the notification subject. |
| Private local data defaults | Added | `.gitignore` excludes local inquiry records, uploads, dependencies, build output, and local environment secrets. |
| Production output consistency | Added | The build copies Cloudflare's `_headers` into `dist`; Wrangler and the deploy script both target `dist`. |
| Automated validation | Added | GitHub Actions checks JavaScript syntax, runs backend tests, builds the site, and verifies the security-header file is present. |

## Still needs real information or an external service

| Function | Status | What is needed |
|---|---|---|
| Actual project portfolio / case studies | Needs owner assets | Approved photos, project names/locations, scope descriptions, and permission to publish. The current gallery must not be presented as C + D's completed work. |
| Architect / team profile and credentials | Needs owner facts | Approved biography, exact professional title, qualifications, license details (if applicable), and team photos. None are invented. |
| Testimonials and reviews | Needs real client input | Genuine client quotes and permission to publish them. No sample endorsements are fabricated. |
| Real public contact details | Needs owner configuration | Enter approved details into `public/site-config.js`. |
| Live appointment booking | Not connected | Add a real public scheduling URL to `bookingUrl` in `public/site-config.js`. Until then, clients can request a consultation through the brief. |
| Accurate service-area map | Needs address/service area | Enter the verified address or service-area text; the map link depends on the address field. |
| Quote / fee estimator | Not added intentionally | Requires approved fee rules, rates, inclusions, exclusions, and a disclaimer; an invented estimator could mislead clients. |
| Secure inquiry dashboard for the studio | Not included | Requires an authenticated, access-controlled admin area; inquiry JSON should not be exposed as a public website page. |
| Live notification email | Not configured | Configure D1/R2, verified sender, destination inbox, and Resend secret; test a real submission before launch. |
| Client confirmation email | Not included | Can be added when the studio approves sender details and email wording. |
| Advanced anti-spam (Turnstile/rate limits) | Recommended before launch | The current form has a honeypot and size/type checks; production anti-spam controls still need Cloudflare configuration. |
| Analytics / advertising cookies | Not included | Add only if needed, with a suitable privacy and consent approach. |
| Contract terms / engagement agreement | Not included | Requires the studio's actual terms, deliverables, fees, cancellations, intellectual property, and professional responsibilities. |

## Go-live checklist

1. Fill verified contact details in `public/site-config.js`.
2. Replace or supplement inspiration photography with authorized completed-project work, and add approved profiles and testimonials only when available.
3. Review/finalize `public/privacy.html` and the service descriptions.
4. Configure Cloudflare D1, R2, verified email sender, Resend secret, and production anti-spam controls.
5. Submit a test inquiry with and without files, confirm D1/R2 records and email delivery, and verify that a client never sees another client's inquiry.
6. Run `npm run check`, `npm test`, and `npm run build`; confirm the GitHub Actions workflow passes.
7. Test on a phone and a desktop browser before publishing the final URL.
