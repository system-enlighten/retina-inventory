Retina Inventory — Stay Signed In update

Changes:
- Google Identity Services auto_select enabled.
- On reload, Google One Tap attempts to restore sign-in without asking to choose an account.
- The Google sign-in button remains available if automatic sign-in is blocked.
- Sign out disables automatic account selection.
- Product image handling and cloud inventory code are unchanged.

Deploy:
Extract ZIP and upload its contents to the same GitHub repository, then wait for Vercel to deploy.
Refresh the production site after deployment.

Notes:
Google controls whether automatic sign-in is available. Browser third-party cookie settings,
Google account settings, consent, or a fresh browser session can still require selecting an account.
No ID tokens are persisted in localStorage.
Production build could not be verified in the available environment due to missing native Rolldown binding.
