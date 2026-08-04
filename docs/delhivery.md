# Delhivery → Shopify shipment tracking

The account order tracker (`/account/orders/:id`) draws its timeline from one
Shopify field per parcel: the fulfilment's **`latestShipmentStatus`**. That field
only moves when a Shopify **fulfillment event** exists. Marking an order delivered
by hand in the Shopify admin does **not** write one — so the tracker sits on
"Shipped" forever.

This bridge closes that gap. Delhivery pushes a scan on every parcel movement to
`POST /api/webhooks/delhivery`; the endpoint maps the scan to a Shopify event and
writes it. The tracker then advances **In transit → Out for delivery → Delivered**
on its own, for every real order.

```
Delhivery scan ──POST──▶ /api/webhooks/delhivery ──Admin API──▶ Shopify fulfillment event
                          (map status, find order)                (latestShipmentStatus moves)
                                                                          │
                                                          /account/orders timeline updates
```

## Code

| File | Role |
| --- | --- |
| `api/webhooks/delhivery.ts` | The endpoint: auth, parse, map, match, write. |
| `api/_lib/delhivery.ts` | Status mapping (Delhivery → Shopify) + payload parsing. |
| `api/_lib/fulfillment.ts` | Admin API: find the fulfilment, write the event. |

The one place to tune how Delhivery statuses translate is the table in
`mapToShopifyStatus` (`api/_lib/delhivery.ts`).

## One-time setup

### 1. Admin API scopes

The bridge uses the same Admin app as the newsletter (`SHOPIFY_ADMIN_CLIENT_ID`).
In the **Shopify Dev Dashboard → your app → API access**, add:

- `read_orders` — look up the order a scan belongs to
- `write_fulfillments` — write the shipment event

Release the new version and re-install on the store. The 24h client-credentials
token picks up the scopes automatically. (Without them the endpoint returns a
`Access denied … read_orders` error in the logs.)

### 2. Webhook secret

Set a shared secret in Vercel (Project → Settings → Environment Variables):

```
DELHIVERY_WEBHOOK_SECRET=<32+ random hex chars>
```

Fail-closed: with no secret set, every call to the endpoint is rejected.

### 3. Register the URL with Delhivery

Ask your Delhivery account manager to enable the **Status Push / tracking
webhook** to:

```
https://look.ind.in/api/webhooks/delhivery?token=<DELHIVERY_WEBHOOK_SECRET>
```

If their panel supports custom headers instead of a query token, use either
`X-Webhook-Token: <secret>` or `Authorization: Bearer <secret>` — the endpoint
accepts all three.

### 4. The join key — order reference

Shopify can't be searched by tracking number, so the bridge matches a scan to an
order by **Delhivery's `ReferenceNo`**. When a shipment is manifested with
Delhivery, its client/order reference **must be set to the Shopify order number**
(e.g. `1001` for order `#1001`). If the AWB is also written onto the Shopify
fulfilment's tracking, the bridge uses it to pick the exact parcel on a split
shipment — nice to have, not required.

## Testing before Delhivery is live

`?dry=1` runs the whole pipeline (auth → parse → map → find the order) but writes
nothing, so you can confirm a scan lands on the right order. Drop `?dry=1` to
actually write the event.

`scripts/delhivery-test-push.mjs` sends a sample scan:

```bash
# Dry run — shows which order/status a "Delivered" scan for #1001 would hit:
DELHIVERY_WEBHOOK_SECRET=<secret> node scripts/delhivery-test-push.mjs 1001 Delivered --dry

# For real — writes the DELIVERED event; the account page then shows Delivered:
DELHIVERY_WEBHOOK_SECRET=<secret> node scripts/delhivery-test-push.mjs 1001 Delivered
```

(Target a preview/prod deploy with `BASE_URL=https://…`; defaults to
`https://look.ind.in`.) A real end-to-end test needs the scopes from step 1 in
place — a dry run only needs `read_orders`.

## What the customer sees

| Delhivery status | Shopify event | Tracker step |
| --- | --- | --- |
| Manifested / awaiting pickup | `CONFIRMED` | Shipped |
| In Transit / Pending / picked up | `IN_TRANSIT` | Shipped |
| Dispatched (out with rider) | `OUT_FOR_DELIVERY` | Out for delivery |
| Undelivered (failed attempt) | `ATTEMPTED_DELIVERY` | Out for delivery |
| Delivered | `DELIVERED` | Delivered |
| RTO / return leg | *(skipped)* | — |

Returns are skipped here because the timeline has a separate "Returned" state
driven by the order's fulfilment status, not by shipment scans.
