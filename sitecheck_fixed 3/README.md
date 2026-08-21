# The Melt Studio — delivery + owner system

## Run locally
1. Install Node.js 20+
2. In this folder, run `npm install`
3. Set `ADMIN_PASSWORD` and `SESSION_SECRET` in your environment.
4. Run `npm start`
5. Open `http://localhost:3000`
6. Owner dashboard: `http://localhost:3000/admin` (the site owner button also opens `admin.html`)

**Important:** the owner dashboard cannot work by opening `index.html` directly with a double-click. The Node server must be running because login, sessions, and orders use the backend API.

The included local `.env` file is configured with the owner password you selected. Keep `.env` private and do not upload it to GitHub or share it publicly. For a real deployment, use your hosting provider’s secret/environment-variable settings instead.

## Delivery pricing
- Kandivali West: ₹25
- Outside Kandivali West: customer must contact The Melt Studio on WhatsApp to confirm the delivery charge.

## Pickup point
The configured origin is an approximate map point for Kandivali MG Road near the Domino's reference point supplied for the project. Confirm the exact origin pin before public launch.

## Storage
Orders are stored in `orders.json` for this prototype. For production, replace it with a hosted database and HTTPS, and set secure cookies.
