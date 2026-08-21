# The Melt Studio — Address-Only Delivery Update

This version keeps the existing customer website, owner login, owner dashboard, and existing orders.

Updated only:
- Removed the customer map, pin/drop-pin flow, and Find My Building/location UI.
- Customer enters the delivery address manually.
- Server diagnoses common local areas from the typed address and estimates distance from the Melt Studio pickup point on M.G. Road, Kandivali, opposite Domino's.
- If the address cannot be confidently diagnosed, checkout opens WhatsApp so the customer can ask for manual delivery-charge confirmation.
- Delivery: Kandivali West ₹25; outside Kandivali West requires WhatsApp delivery-charge confirmation.
- WhatsApp order message remains cleanly formatted with emojis.
- New orders use TMS-YYYYMMDD-### IDs.

No Google Maps link or Google Maps API is used in this version.

Run:
1. npm install
2. npm start

Then open http://localhost:3000
