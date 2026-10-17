# Retina Inventory — Original UI + Cloud Integration (PREVIEW / TEST BUILD)

## Contents
- Original Retina Inventory React interface, including Housing, LED, Driver, BOM, Dimensions, Variants, Compose and History screens.
- Google Sign-In against approved Active users in the permanent Users sheet.
- Cloud stock loading and a check-in/check-out request path through Vercel API and Google Apps Script.
- Products read from the permanent Products tab for SKU validation.
- Existing Apps Script included under `apps-script/Code.gs`.

## IMPORTANT: Not production-ready
This is an **integration preview**. It has NOT passed a successful local build or end-to-end browser test in this environment. Keep your existing deployed Vercel site until you test a preview deployment.

### Known limitations
1. The original interface's embedded housing/LED/driver catalogue remains in the original UI. The permanent Products sheet is used to validate movement SKUs, but the UI is not yet fully dynamically generated from every one of the 1,417 Products rows.
2. The original UI's SKU syntax `D1.0.0` is different from the imported sheet's `D.1`. Only unvaried housing codes can be mapped to imported `D.N` codes. Variant combinations and other codes not in Products are blocked from being transacted.
3. Purchase uploads are browser-only drafts; the Apps Script does NOT validate receiving quantities against a permanent purchase order.
4. The History tab shows only this browser session's successful transactions, not the complete cloud Transactions history.
5. BOM/Dimensions/Variants tabs retain original embedded reference content, not live cloud sheet synchronization.
6. Google Sheets plus Apps Script locking is not a transactional database. Partial failures may leave inconsistent records. Verify balances and Transactions after each test.
7. This environment could not run a successful build due to unavailable native build dependencies. The ZIP is source code, not a verified deployment.
8. Backend Apps Script is a revised version. If you use it, redeploy the Apps Script web app and ensure Vercel RETINA_SCRIPT_URL points to the new `/exec` URL.

## Test safely
1. Keep a backup of the Google Sheet.
2. Create a separate Vercel **preview** deployment, do not overwrite Production.
3. Preserve Vercel server-only variables: GOOGLE_CLIENT_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID, RETINA_SCRIPT_URL, RETINA_SHARED_SECRET. Preserve frontend VITE_GOOGLE_CLIENT_ID.
4. In Google OAuth Authorized JavaScript Origins, add the exact preview domain if using Google Sign-In there; alternatively test at the approved permanent domain after code review.
5. Sign in as an approved Admin.
6. Test product browsing, search, and all tabs.
7. Create a draft purchase with SKU `D1.0.0` and quantity 1, then Check-In 1. This maps to sheet SKU `D.1` only if D.1 exists in Products.
8. Confirm Stock and Transactions in Google Sheets, then test Check-Out.
9. Test role restrictions and concurrent edits before wider employee use.
10. Do not import the Database V2 workbook again; the one-time Products import is already done.

## Security
Never commit .env, service account JSON/private keys, or RETINA_SHARED_SECRET to GitHub.

## Product photographs from Google Sheets (image update)

The card and housing-table views now read `Products` -> `Image URL` (column E) through the existing authenticated `catalog` API. For a base housing `D1.0.0`, the UI matches sheet SKU `D.1` (and similarly D.2, D.3). The URL must be publicly image-readable; Google Drive thumbnail links can be used. Cards fall back to their original category illustrations when the URL is empty or fails to load. The image mapping reloads when the page is refreshed. This does not replace the embedded catalogue or change stock transaction behavior.
