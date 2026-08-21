# The Melt Studio — online backend setup

## 1. Backend (Render)
Create a Render Web Service from this folder/repository.
Build command: `npm install`
Start command: `npm start`

Set environment variables:
- `ADMIN_PASSWORD` = your owner password
- `SESSION_SECRET` = a long random secret (Render can generate this)
- `NETLIFY_ORIGIN` = your exact Netlify site origin, e.g. `https://themeltstudio.netlify.app`

After deploy, test:
`https://YOUR-RENDER-URL/health`
It should return JSON with `ok: true`.

Admin dashboard:
`https://YOUR-RENDER-URL/admin`

## 2. Netlify frontend
In `api-config.js`, replace `https://REPLACE-WITH-YOUR-RENDER-URL` with your actual Render URL.
Then upload the frontend files to Netlify.

## Important
The current order storage is `orders.json`. Render's ordinary service filesystem is not durable across all redeploy/restart scenarios. For a production store, move orders to a persistent database before relying on it for long-term order history.
