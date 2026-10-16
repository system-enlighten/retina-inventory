# Retina Inventory — Check-In / Check-Out setup

## What this update does
- Keeps existing Google Sign-In, Gmail allowlist and shared Google Sheets product catalogue.
- Adds product cards, separate check-in/check-out carts, quantities, reference field and confirmation.
- Uses a **Google Apps Script web app** with `LockService` to serialize concurrent stock changes.
- Updates the `Stock` tab and appends records to `Transactions` after server-side checks.
- Check-in is restricted to `Admin`, `Purchase`, `Store`; check-out to `Admin`, `Store`. Roles are case-insensitive.
- Requires an approved Active Gmail in the `Users` tab.
- The original React app remains at `src/RetinaInventory_Legacy.jsx` for reference.
- **Important limitation:** A purchase reference is recorded but NOT matched against an uploaded purchase order. Do not use this for purchase reconciliation until purchase validation is implemented.
- This Apps Script + Sheets implementation is a lightweight pilot, not an enterprise-grade atomic database. If a script fails partway through a write, some rows could have changed; review transactions and balances. For critical multiuser inventory, migrate stock transactions to a transactional database.

## A. Google Sheet
Do not change your existing tabs or headers. Keep Products, Stock, Transactions, Users.
The script will append missing transaction-specific headings to `Transactions` automatically.
`Stock` needs `SKU`, `Product Name`, `Quantity`, `Unit`, `Last Updated`.
`Users` needs `Email` (or `Employee Email`), `Role`, `Status`.

## B. Apps Script — do this FIRST
1. Open the existing Google Sheet > Extensions > Apps Script.
2. Replace the default `Code.gs` contents with the included `apps-script/Code.gs`.
3. Click Project Settings (gear) > Script properties > Add script property:
   `RETINA_SHEET_ID` = `1a2mW4rfoTn6S9hY-dXQTrN8-oGoxkzmNqoHbOHgLVK0`
4. Add a second script property: `RETINA_SHARED_SECRET` = a long random string (e.g. 48+ random characters). **Keep it secret**.
5. Deploy > New deployment > Web app.
   Execute as: **Me**. Who has access: **Anyone** (the shared secret is checked in script; do not put it in the browser).
   Authorize Google Sheets access when prompted.
6. Copy the Web App `/exec` URL. It must be the deployed web app URL, not the editor URL.

## C. Vercel
Open Vercel > retina-inventory > Settings > Environment Variables.
Keep existing Google OAuth/Sheets settings unchanged.
Add:
- `RETINA_SCRIPT_URL` = Apps Script web app URL ending `/exec`.
- `RETINA_SHARED_SECRET` = exact same long secret as Apps Script property.
Both are server-only; do not prefix either with `VITE_`.
Update the GitHub repo with the files in this project and redeploy Vercel.

## D. Test with your admin Gmail
1. Sign in at the permanent Vercel production domain.
2. Select Check-In, add a product, enter quantity 10, reference `TEST-RECEIPT-001`, confirm.
3. Click Refresh stock. Quantity should increase by 10.
4. Select Check-Out, add 2, reference `TEST-ISSUE-001`, confirm.
5. Confirm Stock quantity has decreased by 2 and Transactions has two new records.
6. Test insufficient stock; it should be rejected.
7. Test a second approved employee. Do not share service account credentials with employees.

## Important
- Do not upload `.env`, service account JSON, private keys, or `RETINA_SHARED_SECRET` to GitHub.
- For personal Gmail login, OAuth app may require test-user registration until publishing.
- The current frontend generates a fresh transaction ID on each confirmation. A network timeout after a successful write may require checking the transaction history before retrying.
- Google Sheets is not a transactional database; this is intended for modest, low-volume inventory use.
