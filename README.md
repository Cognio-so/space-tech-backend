# Backend (Vercel)

This is a separate Node backend meant to be deployed as its own Vercel project.

## Endpoints

- `POST /api/contact` sends lead email + user confirmation via Nodemailer (Gmail).

## Environment Variables

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `CONTACT_TO_EMAIL` (optional, defaults to `GMAIL_USER`)
- `ALLOWED_ORIGINS` (comma-separated)

## Local Dev

```sh
cd backend
npm install
npm run dev
```

This starts a local Node server on `http://localhost:3001`.

If you want to emulate Vercel Functions locally:

```sh
npm run dev:vercel
```
