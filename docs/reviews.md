# Customer reviews

LOOK runs its own reviews rather than an app. Judge.me was installed on
2026-09-08 and abandoned once the useful tier turned out to cost $15/mo, and the
client wanted something she controls outright anyway.

Three stores, each holding the thing it is best at:

```
MongoDB Atlas      the review text, photos-as-URLs, and moderation state
Shopify Files      the photo bytes  →  cdn.shopify.com (already CSP-allowed)
Shopify metafields the per-product aggregate  →  custom.review_rating / custom.review_count
```

The aggregate lives in Shopify on purpose: the storefront already loads the
catalog, so the PDP summary, the quick view and Shop the Hits all show stars with
**no extra fetch**. Computing it in the browser would mean a second request
before the PDP's above-the-fold summary and a whole-catalog aggregate call on the
homepage just to sort one section.

## The flow

```
order delivered
   │  daily cron, 3 days later
   ▼
review-request email ──▶ /shop/<handle>?review=<signed token>
                              │
                              ▼
                       shopper writes it ──▶ status: pending
                              │
                              ▼
                   owner approves in /admin → Reviews
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
        product page    homepage wall    rating metafield
                        (if featured)    (recomputed + written)
```

## Code

| File | Role |
| --- | --- |
| `api/reviews.ts` | The whole endpoint, multiplexed by `?action=`. |
| `api/_lib/mongo.ts` | Connection, document shape, indexes. |
| `api/_lib/reviews.ts` | Queries, moderation writes, the aggregate write-back. |
| `api/_lib/reviewAccess.ts` | Who may review what: signed invite links + order history. |
| `api/_lib/reviewPhoto.ts` | Signs an uploaded photo so `submit` can trust it. |
| `api/_lib/files.ts` | Shopify Files upload (staged → PUT → fileCreate). |
| `api/_lib/reviewRequests.ts` | The daily sweep, and the owner's "one is waiting" note. |
| `src/lib/reviews.ts` | The SPA half. Never throws. Also `cdnResize()`. |
| `src/lib/reviewPhoto.ts` | Browser-side downscale. Read the CSP notes before editing. |
| `src/pages/admin/AdminReviews.tsx` | The owner's Reviews tab. |
| `src/components/product/ReviewForm.tsx` | What the shopper fills in. |
| `src/data/reviewWall.ts` | `composeWall()` — always returns exactly nine. |

## Actions

| Action | Method | Who |
| --- | --- | --- |
| `wall` | GET | public, cached 60s |
| `list&product=<gid>` | GET | public, cached 60s |
| `eligibility&product=<gid>[&token=]` | GET | anyone; **never** cached |
| `photo` | POST | anyone who may review that piece, or the owner |
| `submit` | POST | anyone who may review that piece |
| `admin` | POST | owner; `body.op` selects the operation |

`admin` ops: `list, create, approve, reject, feature, unfeature, reorder,
delete, resync`. The auth preamble runs at the top of that one case **before**
`body.op` is read, so a new op inherits the gate by construction. `delete` steps
up with the password.

## Things that will bite

**Unsetting `MONGODB_URI` is the kill switch.** Reads return an empty list and
writes answer 503 — the homepage wall falls back to its nine hand-written notes,
the product page reads "Reviews (0)", nothing 500s. That is the rollback for this
whole feature and it needs no deploy. It is deliberate, not an accident: see the
comment on `isReviewsConfigured()`. The one thing that *does* fail closed is a
non-TLS `mongodb://` URI on an https deployment.

**Never create an object URL in the browser.** `blob:` is not in our `img-src`,
and that applies to the decode path as much as the preview. `createImageBitmap`
takes the File directly and applies EXIF rotation; the canvas emits a `data:` URL,
which `img-src` already allows. **Net CSP change for the whole feature: zero.**
A `blob:` mistake works locally — the dev server sets no CSP — and fails only in
production.

**`reviews.rating` is not available to us.** It is reserved for reviews *apps*:
`metafieldDefinitionCreate` answers `RESERVED_NAMESPACE_KEY`, and there is no
standard template to enable either (all 8,518 were scanned on 2026-09-16; the
`reviews` namespace does not appear). Hence `custom.review_rating`. If you ever
add a metafield the storefront must read, **check Storefront access with the
Storefront token** — a definition with it off looks perfect in the admin and
returns `null` to the shop, so the write reports success and the page quietly
says "No reviews yet".

**Wall positions 1–3 are the LEFT COLUMN on desktop, not the top row.** CSS
multi-column fills top-to-bottom before it wraps. The admin picker fills downward
to match and says so in words; don't "fix" it into a row-major grid.

**The aggregate write is best-effort.** A Shopify hiccup during moderation leaves
a product's stars stale rather than failing her click. The `resync` op — the
"Recalculate star ratings" button — is the repair tool.

**Photos need `read_files` + `write_files`.** Without them the upload answers
`ACCESS_DENIED`, which `files.ts` translates into a message that says exactly
that. Adding scopes requires re-releasing *and* re-installing the app.

**`tsc -p api` is part of `npm run build`.** It wasn't before this feature; the
root build only ever typechecked `src`, so a type error in the BFF shipped
silently. Don't remove it.

## Configuration

```
MONGODB_URI=mongodb+srv://…      # unset = feature off, gracefully
MONGODB_DB=look                  # optional
OWNER_EMAIL=…                    # optional; where "a review is waiting" goes,
                                 # defaults to EMAIL_REPLY_TO then support@look.ind.in
```

Atlas: region `ap-south-1` (Mumbai), a `readWrite` user scoped to the one
database, Network Access `0.0.0.0/0` — Hobby functions have no static egress IP
and there is no narrower rule that works. A free M0 cluster **pauses after ~60
days idle**; the driver's 5s server-selection timeout means a paused cluster
degrades instead of hanging.

Indexes are created on first connect by `ensureIndexes()`. The one worth knowing
about is `wall_rank_unique` — unique and partial on `wallRank: {$type:"number"}`,
which makes "one review per wall position" a database invariant rather than
something every handler has to remember. Inserting a second review with
`wallRank: 1` raises `E11000`.

## Open

- **Privacy policy.** The existing "Product Reviews & User Content" section
  already permits displaying customer reviews and photos. It does not mention
  that we retain the reviewer's email address and a salted hash of their IP for
  moderation. That copy is the client's and is not ours to edit — raise it with
  her. (The IP is stored hashed, never raw, and neither field is ever served to
  the browser; the admin sees the email masked.)
- The review-request email uses the built-in defaults. Add a `review_request`
  entry to the `email_template` metaobject to let the client edit the copy,
  exactly as with the other three.
