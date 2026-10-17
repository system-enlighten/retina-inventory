Retina Inventory - persistent sign-in (7-day server-signed session)

What changes:
- Successful Google login creates a Secure, HttpOnly, SameSite=Lax cookie signed by the Vercel backend.
- Refresh restores the authenticated user from that cookie without Google account selection.
- The backend checks the active Users sheet on every request.
- Sign out clears the cookie.
- Browser does not save Google ID tokens in localStorage.

Deployment:
1. Replace repository files with contents of this ZIP.
2. In Vercel Environment Variables add RETINA_SESSION_SECRET as a long random string (32+ characters).
   Existing RETINA_SHARED_SECRET also works as fallback, but a separate secret is preferable.
3. Redeploy Vercel, sign in once, then refresh.
4. Cookies must be enabled for retina-inventory.vercel.app.

Limitations:
- Session lasts up to 7 days after sign-in. After expiration Google sign-in is required.
- If cookies are blocked, session persistence won't work.
- No successful production build was possible in the available environment due to missing native Rolldown binding.
