# Retina Inventory on Vercel and Google Apps Script

The Vercel home opens **Orders & Production** after Google sign-in. The Retina workspace comes with workbenches, manufacturing job cards, BOMs, storage map, catalogue, Nomenclature fitting matrix and dispatch history.

The production workspace writes to a separate **Retina Production Register** tab in the selected Google spreadsheet. The earlier Inventory screen is removed from navigation. Its product and stock sheets are retained separately. Production sample stock and dispatch deductions apply to the production register. Reconcile or migrate component balances and BOMs before using it for live warehouse stock.

## 1. Update the Apps Script backend

1. Open the existing Retina Apps Script project. Keep your current deployment and script properties.
2. If your existing Code.gs matches the Retina package's backend, replace it with `apps-script/Code.gs`. If it has additional custom code, add the `productionLoad` and `productionSave` branch from the packaged `doPost` to yours, after the shared-secret check and before the existing actions. Keep your other project files.
3. Create a script file named `Production` and paste `apps-script/Production.gs`. It uses the existing `getSpreadsheet_` and `reply_` integration.
4. Confirm the existing script property `RETINA_SHARED_SECRET` matches Vercel. `RETINA_SHEET_ID` selects the spreadsheet for an unbound script or overrides the bound spreadsheet.
5. In **Deploy → Manage deployments**, edit the current Web app deployment and select **New version**, then deploy. The packaged flow expects the app to execute as the deployer and be reachable by the Vercel proxy. The proxy authenticates to Apps Script with the shared secret. Keep using the existing `/exec` URL if the deployment URL stays the same.

## 2. Update the Vercel frontend

1. Copy the contents of `frontend/` into the directory Vercel builds in your connected Git repository. If you keep the package folder structure in Git, set the Vercel root to `frontend`.
2. Keep the existing environment variables. The required names are listed in `frontend/.env.example`. Use the same OAuth web client ID in `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`. The server uses the existing Google Sheets service account and active Users sheet for access. `RETINA_SESSION_SECRET` is optional when `RETINA_SHARED_SECRET` is set. Keep all secrets in Vercel environment variables.
3. Deploy from Git. Open the Vercel domain and sign in. **Orders & Production** opens automatically at the site root. Older `/production/index.html` bookmarks redirect to the root.

## 3. Test the workflow

1. With an Admin account, open **Settings → Load sample records** on the empty production register, or start by adding actual workbenches and components. Sample records can be loaded only before the first production save. Admin and Store users can save production changes.
2. Choose an industrial workbench or a commercial, residential, or hospitality project. Add a product, cut the KOT as **Sale** or **Mock-up**, mark it built, then dispatch. Verify that both deduct stock and only sales contribute to the sales total.
3. Reload the production page or sign in from a second browser and confirm the dispatch is still present. For concurrent editing, use **Reload production** if prompted about a newer revision.

The production workspace starts empty on a fresh spreadsheet. The register is stored as a revisioned snapshot in Google Sheets with a 900 KB UTF-8 limit. JSON export is available in Settings.

## If the register reports an unsupported backend action

The Apps Script URL in `RETINA_SCRIPT_URL` must point to a deployed version of the web app that includes the production action branch in `Code.gs` and the `Production.gs` file. Saving Apps Script source alone does not publish it. Edit the deployment, create a new version, deploy it, then use **Reload production**.
