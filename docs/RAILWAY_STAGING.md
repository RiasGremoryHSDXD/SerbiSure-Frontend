# Railway staging mobile build

Branch: `chore/railway-api-url`.

Backend: `https://serbisure-backend-staging-production.up.railway.app`.
It uses the isolated Neon `staging-environment` database. Both API configuration
entrypoints select this backend by default. HTTP and WebSocket traffic use that
same address without automatic server fallback.

From this repository in PowerShell:

```powershell
$env:EXPO_PUBLIC_API_URL = 'https://serbisure-backend-staging-production.up.railway.app'
npm run build:android
```

The URL is compiled into the APK. Rebuild/reinstall after changing it; existing
installed production APKs are not changed by deployment or Git checkout. Sign
out/in when moving between isolated datasets. This branch changes configuration,
not the Android application ID; installing its APK replaces the existing app.

Rollback: return to `main` or `backup/pre-railway-staging-20261024`
(`efdd20f470aed6d529e562677bb57ef630affd90`), restore any prior local environment
override, and use the previously working production APK.
