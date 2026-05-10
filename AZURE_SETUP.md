# ClinicApp Azure Setup

## Frontend

The Angular app lives in `C:\Users\sulej\Desktop\ClinicApp\Frontend\ClinicAppWeb`.

1. Build with `npm run build`.
2. Edit `public/app-config.json` before deployment if your API is not served from the same `/api` path.
3. Deploy `dist/ClinicApp/browser` to Azure Static Web Apps or any static host.
4. `public/staticwebapp.config.json` is already included for client-side route fallback.

## Backend

The API lives in `C:\Users\sulej\Desktop\ClinicApp\Backend\ClinicApp.API`.

Set these Azure App Service settings:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Key`
- `Jwt__Issuer`
- `Jwt__Audience`
- `App__FrontendBaseUrl`
- `Email__SmtpHost`
- `Email__SmtpPort`
- `Email__EnableSsl`
- `Email__FromEmail`
- `Email__FromName`
- `Email__Username`
- `Email__Password`

## Password reset mail

The backend already sends real SMTP mail.

Recommended approach:

1. Create a free SMTP account with the provider you prefer.
2. Use a sender like `no-reply@your-domain` or the provider mailbox you are given.
3. Store credentials in Azure App Service configuration, not in `appsettings*.json`.

## Demo data reset

Run this script to wipe demo data and apply the new seeded dataset:

`C:\Users\sulej\Desktop\ClinicApp\scripts\Reset-ClinicAppDemoData.ps1`
