# Retina Inventory — Vercel + Google Sign-In + Google Sheets starter

## Status and limitations
This starter is **read-only** for cloud inventory. It supports Google Sign-In with personal Gmail accounts, server-side ID-token verification, an allowlist in `Users`, and shared Products/Stock reading from Google Sheets. **It does NOT yet process check-in/check-out, purchases, or import to shared Sheets**. The old JSX is preserved as `src/RetinaInventory_Legacy.jsx` for migration; it is not mounted because its localStorage-based stock would be misleading for employees.

## 1. Google Sheet
Create a spreadsheet from `Retina_Inventory_Google_Sheets_Template.xlsx` (provided separately).
Use these column headers:
- Users: `Employee Email`, `Role`, `Status` (e.g. `employee@gmail.com`, `Store`, `Active`)
- Products: `SKU`, `Product Name`, `Image URL`
- Stock: `SKU`, `Quantity`
The sheet may have other columns. Ensure first row is headers.

## 2. Google Cloud
1. Create Google Cloud project and configure Google Auth Platform OAuth consent screen (External).
2. Add employee Gmail accounts as test users if OAuth is in Testing mode.
3. Create OAuth client: **Web application**. Authorized JS origins: `http://localhost:5173` and later your production `https://YOUR-PROJECT.vercel.app`.
4. Enable Google Sheets API.
5. Create service account and JSON key. **Do not put the JSON key in your React source or Git repository.**
6. Share the Google Sheet with service account email as **Viewer** (read-only starter).

## 3. Environment variables (Vercel Project Settings → Environment Variables)
- `VITE_GOOGLE_CLIENT_ID`: OAuth Web client ID (public).
- `GOOGLE_CLIENT_ID`: same OAuth Web client ID (server).
- `GOOGLE_SHEET_ID`: value between `/d/` and `/edit` in the Sheet URL.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: email from service-account JSON.
- `GOOGLE_PRIVATE_KEY`: private_key from service-account JSON; keep server-side only.

## 4. Install in Windows CMD
Extract project ZIP into a NEW folder (do not overwrite your existing project).
`cd /d C:\Users\HP\retina-cloud`
`npm install`
`npm run build`

## 5. Deploy
`npm install -g vercel`
`vercel login`
`vercel`
Set Vite framework, `npm run build` build command, `dist` output.
Set Vercel environment variables. Add deployed HTTPS domain to OAuth JS origins, then redeploy:
`vercel --prod`

## 6. Local API testing
`npm run dev` alone runs the Vite UI but **not the /api Vercel Function**. Use `vercel dev` after linking project and configuring environment variables.

## Before enabling live check-in/out
Implement a transactional stock writer with atomic operations and idempotency (e.g. Google Apps Script LockService serialized writes or a transactional database), server-side authorization per action, purchase-receipt validation, transaction ledger, and audit tests with two concurrent employees. Do not expose a Sheets write key to the browser.

Personal Gmail: allow only verified `@gmail.com` addresses listed as Active in the Users tab.
