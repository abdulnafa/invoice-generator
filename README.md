# Marketus Marshal invoice generator

A free, browser-based invoice generator styled after the supplied Marketus Marshal invoice. Enter invoice details, preview the document, and download a PDF. No account or server is required. Draft data stays in your browser; bank and contact details from the reference invoice are not included in the public source.

**Download PDF** creates a visual PDF directly in the browser. **Print / Save PDF** opens the browser print dialog and produces a PDF with selectable text when you choose *Save as PDF*.

## Run locally

Requires Node.js 24 or later.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. To make a production build, run `npm run build`; the static files are written to `dist/`.

## Publish on GitHub Pages

The [Pages workflow](.github/workflows/deploy-pages.yml) builds and deploys the app when `main` is pushed. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source. Once the workflow succeeds, the app is available at `https://abdulnafa.github.io/invoice-generator/`.

The workflow assumes the repository name is `invoice-generator`. If the name changes, update the `--base` path in the workflow to match.
