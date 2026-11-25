# Retina Inventory on Vercel and Google Apps Script

The Vercel home opens **Departments** after Google sign-in. The Retina workspace comes with workbenches, manufacturing job cards, BOMs, storage map, catalogue, Nomenclature fitting matrix and dispatch history.

The production workspace writes to a separate **Retina Production Register** tab in the selected Google spreadsheet. The earlier Inventory screen is removed from navigation. Its product and stock sheets are retained separately. Production sample stock and dispatch deductions apply to the production register. Reconcile or migrate component balances and BOMs before using it for live warehouse stock.

## 1. Update the Apps Script backend

For Sales CRM, also add a script file named `Crm` from `apps-script/Crm.gs` before deploying the new version. CRM records are stored in a worksheet called **Retina Sales CRM**, created on the first successful save. The web app exposes it to the Sales department.

Open **Sales & Distribution → CRM**. Use Site Survey to locate captured sites, Pipeline to log calls and change stages, and Effect Pricing to set pre-tax tariffs. Open a lead in Sales POS to configure a catalogue product. When adding the product, select the relevant CRM effect to copy its quantity and quoted rate. Application-specific effects and configurations without a tariff require an entered price. Moving a lead to Closed Won adds it to Customers. Sales order release follows Retina’s existing estimate workflow.

1. Open the existing Retina Apps Script project. Keep your current deployment and script properties.
2. If your existing Code.gs matches the Retina package's backend, replace it with `apps-script/Code.gs`. If it has additional custom code, add the `productionLoad` and `productionSave` branch from the packaged `doPost` to yours, after the shared-secret check and before the existing actions. Keep your other project files.
3. Create a script file named `Production` and paste `apps-script/Production.gs`. It uses the existing `getSpreadsheet_` and `reply_` integration.
4. Confirm the existing script property `RETINA_SHARED_SECRET` matches Vercel. `RETINA_SHEET_ID` selects the spreadsheet for an unbound script or overrides the bound spreadsheet.
5. In **Deploy → Manage deployments**, edit the current Web app deployment and select **New version**, then deploy. The packaged flow expects the app to execute as the deployer and be reachable by the Vercel proxy. The proxy authenticates to Apps Script with the shared secret. Keep using the existing `/exec` URL if the deployment URL stays the same.

## 2. Update the Vercel frontend

1. Copy the contents of `frontend/` into the directory Vercel builds in your connected Git repository. If you keep the package folder structure in Git, set the Vercel root to `frontend`.
2. Keep the existing environment variables. The required names are listed in `frontend/.env.example`. Use the same OAuth web client ID in `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`. The server uses the existing Google Sheets service account and active Users sheet for access. `RETINA_SESSION_SECRET` is optional when `RETINA_SHARED_SECRET` is set. Keep all secrets in Vercel environment variables.
3. Deploy from Git. Open the Vercel domain and sign in. The department chooser opens at the site root. Older `/production/index.html` bookmarks redirect to the root.

## 3. Test the workflow

1. With an Admin account, open **Settings → Load sample records** on the empty production register, or start by adding actual workbenches and components. Sample records can be loaded only before the first production save. Admin and Store users can save production changes.
2. Choose an industrial workbench or a commercial, residential, or hospitality project. Add a product, cut the KOT as **Sale** or **Mock-up**, mark it built, then dispatch. Verify that both deduct stock and only sales contribute to the sales total.
3. Reload the production page or sign in from a second browser and confirm the dispatch is still present. For concurrent editing, use **Reload production** if prompted about a newer revision.

The production workspace starts empty on a fresh spreadsheet. The register is stored as a revisioned snapshot in Google Sheets with a 900 KB UTF-8 limit. JSON export is available in Settings.

## If the register reports an unsupported backend action

The Apps Script URL in `RETINA_SCRIPT_URL` must point to a deployed version of the web app that includes the production action branch in `Code.gs` and the `Production.gs` file. Saving Apps Script source alone does not publish it. Edit the deployment, create a new version, deploy it, then use **Reload production**.

## Existing Housing, LED, and Driver catalogue

The existing catalogue is loaded automatically in Orders & Production, Inventory, and BOM. The app reads the existing catalogue sheets and uses the included original catalogue snapshot if the live read fails. Inventory labels earlier balances as **Old stock**. To use a catalogue component in manufacturing, add it to the production stockroom, post the actual opening quantity, and include it in a luminaire BOM. Adding a component does not copy an opening quantity.

## Departments

Open **Departments** to choose Manufacturing Operations or switch to Sales & Distribution, Purchase & Supply Chain, Accounts, Marketing, Patent & Legal Team, or HR & Team Building. Sales opens the existing Catalogue and Dispatch Register, Purchase opens shared inventory and receiving, and Marketing opens the Catalogue. Billing, worldwide distribution workflows, accounting, patent/legal tracking and HR workflows require separate implementation.

Add a **Department** column to the existing **Users** sheet. Set your own active user’s **Role** to **Admin** for access to all seven departments. For team members, enter the exact department name shown in the chooser. A blank or unrecognized assignment grants no department access. Non-admin production writes require the **Store** role and **Manufacturing Operations** assignment. Purchase has read-only production inventory access.

Catalogue cards give priority to bundled thumbnails matched by housing number. Other records still use their configured image links and show a category icon if a photo is missing or inaccessible. After-sales Service is under Sales & Distribution and R&D is under Manufacturing Operations in the department directory.

### Sales CRM site capture

Set `RETINA_GEOCODING_KEY` in the Vercel environment to a server-side Google Maps Platform key with the Geocoding API enabled, then redeploy. The CRM uses browser location permission to preview a map pin and request a locality. If location or lookup is unavailable, the sales rep can enter the area manually. The CRM records the timestamp on the server when a new lead is saved and displays it in IST. **Enquiries** lists leads marked **Inbound enquiry**, including those entered via **Add enquiry**.
