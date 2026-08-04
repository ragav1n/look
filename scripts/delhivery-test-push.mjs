/**
 * Simulate a Delhivery status-push against /api/webhooks/delhivery.
 *
 * Lets you verify the shipment-event bridge end-to-end before Delhivery is wired
 * up — send a fake "Delivered" scan for a real order and watch the account page's
 * tracker advance. See docs/delhivery.md.
 *
 * Usage:
 *   DELHIVERY_WEBHOOK_SECRET=<secret> node scripts/delhivery-test-push.mjs <orderNumber> [status] [--dry]
 *
 * Examples:
 *   DELHIVERY_WEBHOOK_SECRET=… node scripts/delhivery-test-push.mjs 1001 Delivered --dry
 *   DELHIVERY_WEBHOOK_SECRET=… node scripts/delhivery-test-push.mjs 1001 Dispatched
 *
 * Env:
 *   DELHIVERY_WEBHOOK_SECRET  required — must match the deployment's secret
 *   BASE_URL                  target origin (default https://look.ind.in)
 *   AWB                       optional tracking number to include on the scan
 */

const secret = process.env.DELHIVERY_WEBHOOK_SECRET?.trim();
if (!secret) {
  console.error("Set DELHIVERY_WEBHOOK_SECRET (must match the deployment).");
  process.exit(1);
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const positional = args.filter((a) => !a.startsWith("--"));
const orderNumber = positional[0];
const status = positional[1] ?? "Delivered";
if (!orderNumber) {
  console.error("Usage: node scripts/delhivery-test-push.mjs <orderNumber> [status] [--dry]");
  process.exit(1);
}

const base = (process.env.BASE_URL ?? "https://look.ind.in").replace(/\/+$/, "");
// Coarse Status → StatusType, matching Delhivery's own buckets.
const s = status.toLowerCase();
const statusType = s.includes("deliver") && !s.includes("undeliver")
  ? "DL"
  : s.includes("rto") || s.includes("return")
    ? "RT"
    : "UD";

const body = {
  Shipment: {
    AWB: process.env.AWB?.trim() || "TEST" + orderNumber,
    ReferenceNo: String(orderNumber),
    NSLCode: "TEST",
    Status: {
      Status: status,
      StatusType: statusType,
      StatusDateTime: new Date().toISOString().replace("Z", ""), // Delhivery sends no zone
      StatusLocation: "Test_Facility_DC (Test City)",
      Instructions: `Simulated ${status} scan`,
    },
  },
};

const url = `${base}/api/webhooks/delhivery?token=${encodeURIComponent(secret)}${dry ? "&dry=1" : ""}`;
console.log(`POST ${base}/api/webhooks/delhivery${dry ? "  (dry run)" : ""}`);
console.log(JSON.stringify(body, null, 2));

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
console.log(`\nHTTP ${res.status}`);
console.log(await res.text());
