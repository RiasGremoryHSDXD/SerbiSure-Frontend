# Railway production mobile build

Branch: `chore/railway-api-url`.

Backend: `https://serbisure-production-backend.up.railway.app`.
Both API configuration entrypoints select this backend for release builds.
HTTP and WebSocket traffic use that same address without automatic server
fallback. The backend's `DATABASE_URL` selects the database; this mobile change
does not modify it.

From this repository in PowerShell:

```powershell
npm run build:android
```

The production URL is compiled into the APK. `EXPO_PUBLIC_API_URL` is honored
only in development (`__DEV__`); release builds ignore stale environment overrides.
For local development, set it to the PC's Django URL (including port 8000) in an
ignored `.env.local`, then restart Metro. Without an override, development uses
the production Railway backend too.

Rebuild/reinstall after changing the production URL; existing installed APKs are
not changed by deployment or Git checkout. Sign out/in when moving between
datasets. This branch changes configuration,
not the Android application ID; installing its APK replaces the existing app.

Rollback: return to `main` or `backup/pre-railway-staging-20261024`
(`efdd20f470aed6d529e562677bb57ef630affd90`), restore any prior local environment
override, and use the previously working production APK.
