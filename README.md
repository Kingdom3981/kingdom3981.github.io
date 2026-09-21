# Kingdom 3981

A build-free website for GitHub Pages. Upload the **contents of this folder** to your repository root. There are two main pages plus GitHub Pages’ error page. No installation, compilation, server, package manager, or GitHub Actions workflow is required. You can open `index.html` directly; browser push needs the deployed HTTPS site.

## Files

- `index.html`: Home and recruitment content.
- `bauler-runs.html`: Countdown, route and useful-information gallery.
- `404.html`: Standalone error page.
- `assets/css/styles.css`: Shared layout, colors and responsive styles.
- `assets/js/config.js`: Public configuration, schedule, image list.
- `assets/js/translations.js`: English, Russian, Spanish and Vietnamese text.
- `assets/js/app.js`: Language selection and Discord handling.
- `assets/js/bauler.js`: UTC countdown and keyboard-accessible image viewer.
- `assets/js/notifications.js`: Opt-in OneSignal integration.
- `push/onesignal/OneSignalSDKWorker.js`: OneSignal service worker.
- `.nojekyll`: Serve the repository as plain static files.

## Edit homepage text

Change layout or markup in `index.html`. Text marked `data-i18n="key"` is replaced by the matching entry in `translations.js`; edit that entry too. Update each language’s value for consistent translations. Unmarked text such as `34M+`, `250M+`, `VIP 14+` and the kingdom number can be edited directly in HTML. The fallback English text in HTML keeps the homepage readable if JavaScript is unavailable.

## Discord

Set `discordUrl` in `assets/js/config.js` to your real HTTPS invitation. An empty or invalid value displays an honest unavailable message.

## OneSignal Web Push

1. Deploy the site first. Create a OneSignal app and set up its Web platform using **Typical Site / Custom Code** as appropriate to the current dashboard.
2. Configure your actual HTTPS site origin, e.g. `https://USERNAME.github.io`. If the dashboard accepts the full site URL, use `https://USERNAME.github.io/REPOSITORY/`. Use the same hostname consistently; custom domains are separate origins.
3. Add the **public App ID** to `oneSignalAppId` in `assets/js/config.js`.
4. Disable automatic permission prompts and the subscription bell in the dashboard. Subscription is initiated only by the site’s notification buttons. The code also disables automatic slidedown prompts and loads the SDK only after a click.
5. In advanced/custom service-worker settings, set the worker path to `/REPOSITORY/push/onesignal/OneSignalSDKWorker.js` and its scope to `/REPOSITORY/push/onesignal/`. For a user-site repository or custom domain served at root, omit `/REPOSITORY`. The application computes both from the deployed page URL; no repository name is hard-coded.
6. Confirm the worker URL returns JavaScript, not the 404 page. Keeping the scope inside the worker folder avoids needing a `Service-Worker-Allowed` response header, which GitHub Pages cannot customize.
7. In a supported browser on the deployed HTTPS site, click **Enable Kingdom Notifications**, accept the OneSignal prompt, then accept the browser prompt. Verify the subscription in OneSignal and send a test notification from its dashboard. If permission was previously denied, change the browser’s site permission first.

No REST API key, organization key, password, or secret belongs in this repository. The public App ID is the only OneSignal credential needed here. Notifications are sent from the OneSignal dashboard; this site contains no sending API. OneSignal requires an external network connection; the other site content and translations are local static files. Browser/OS restrictions still apply, including iOS installation requirements. Multiple OneSignal apps on the same GitHub Pages origin may conflict; prefer one app per origin or a dedicated custom domain.

Documentation: [Web SDK reference](https://documentation.onesignal.com/docs/web-sdk-reference), [service-worker setup](https://documentation.onesignal.com/docs/onesignal-service-worker).

Live subscription and delivery must be tested after the real App ID and deployed origin are configured. An empty App ID never claims a successful subscription.

## Replace the Bauler route

Place your real image at `assets/images/bauler/route.webp`, then change `routeImage` in `config.js` to that path. The supplied placeholder is `route-placeholder.svg`. The “official route” note disappears when a real filename is used. The image keeps its natural aspect ratio and is never cropped.

## Useful Information images

Replace entries in `usefulImages` in `config.js`, or add/remove entries. Each entry has a repository-relative `src` and a translation `key`. Add that key to `translations.js` for all languages. The five supplied SVG images are deliberately blank placeholders, not invented guides. Replacing them removes the “Image coming soon” note. Portrait and landscape images keep their natural proportions; the viewer supports Escape, arrow keys, Tab, and close/previous/next buttons.

## Translations

Edit the four dictionaries in `translations.js`. Missing keys fall back to English. Language selection updates immediately and persists through localStorage when the browser allows it. Flags are small buttons with native-language accessible labels. Game names and numeric requirements remain unchanged. The standalone 404 page includes its small translation dictionary inline so it works even at arbitrary missing paths.

## Change the schedule

Edit `baulerHoursUTC: [8, 20]` in `config.js` using whole UTC hours from 0 through 23. The display and countdown use this list. Also update the translated `twice` sentence and page metadata if the number or times of runs change. At exactly a scheduled time the countdown advances to the following run. The countdown displays hours, minutes, seconds only, regardless of the visitor’s timezone.

## GitHub Pages deployment

1. Create a GitHub repository and commit all contents of this folder to `main` at the repository root. Include `.nojekyll`.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: / (root) → Save.**
3. Wait for GitHub Pages to publish, then open the URL shown by GitHub.
4. Set your Discord and OneSignal values and commit the edits. Normal future HTML/CSS/JS edits deploy the same way.

All normal page and asset paths are relative, so `https://USERNAME.github.io/REPOSITORY/` works without changing the repository name in code. The error page discovers the nearest existing Kingdom homepage for nested missing URLs. No Actions workflow is needed.

## Artwork

Artwork, logo, flags, trophy and icons were extracted from your two supplied reference images; explanatory asset-sheet labels are excluded. No separately supplied original logo was available, so the sheet’s logo is used without regeneration. Replace `assets/images/branding/logo.webp` and the favicon if you have the higher-resolution original. The reference sheet’s hero is only 642 × 203 pixels: layout follows the supplied design, but this limited source cannot match the full-resolution reference’s exact cinematic framing. Supply the original background artwork for sharper desktop rendering. Text, cards, buttons and dividers are live HTML/CSS, not a flattened screenshot.

## Verification performed

JavaScript syntax, all four translation dictionaries, 46 local HTML/CSS references, the three requested UTC examples, exact-run boundaries, year rollover and a 23-hour countdown were checked successfully. Language updates and persistence across simulated page loads were also checked. The packaged site is approximately 230 KB.

Browser visual inspection, mobile rendering, live HTTP project-path behavior and live push delivery were not verified in this environment: local-server permission was unavailable and the browser policy blocked file URLs. Before publication, open both pages on desktop and mobile, switch languages and navigate between pages, test the image viewer with keyboard and touch, and check a nested missing URL after deployment. Artwork composition is approximate because only the flattened reference images were supplied.
