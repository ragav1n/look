/**
 * The Reviews tab of the owner console.
 *
 * Four things, in the order she'll want them:
 *   01  what's waiting on her
 *   02  the nine notes on the homepage wall, and their order
 *   03  typing up a review that arrived on Instagram or WhatsApp
 *   04  everything else, plus the repair button
 *
 * Written for someone who is not going to read documentation: every control says
 * what it does to the live site, and the one genuinely confusing thing about the
 * wall — that positions 1–3 are the LEFT COLUMN on a computer, not the top row —
 * is said out loud rather than left to be discovered.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/types";
import { getAllProducts } from "@/lib/catalog";
import {
  type AdminReview,
  approveReview,
  createOwnerReview,
  deleteReview,
  featureReview,
  hideReview,
  listReviews,
  reorderWall,
  resyncRatings,
  unfeatureReview,
} from "@/lib/admin";
import { cdnResize } from "@/lib/reviews";
import { ACCEPTED_TYPES } from "@/lib/reviewPhoto";
import { useReviewPhotos } from "@/hooks/useReviewPhotos";
/* Imported, not re-declared: the wall is nine because of the homepage layout,
   and that fact belongs in one place. (The BFF keeps its own copy only because
   it cannot import from src/.) */
import { WALL_SIZE } from "@/data/reviewWall";
import { useToast } from "@/context/ToastContext";
import RatingStars from "@/components/ui/RatingStars";
import RatingInput from "@/components/ui/RatingInput";
import { Eyebrow, Field, StatusBadge, StepHeader, cardCls, dangerBtn, inputCls, secondaryBtn } from "./ui";

/** Past this the note gets tall enough to unbalance the wall's columns. */
const BODY_SOFT_LIMIT = 600;
/** Hard cap on the body, matching LIMITS.body on the server. */
const BODY_MAX = 1200;
const MAX_PHOTOS = 5;

const TONE = { pending: "pending", approved: "live", rejected: "hidden" } as const;
const LABEL = { pending: "Waiting", approved: "On the site", rejected: "Hidden" } as const;

export default function AdminReviews() {
  const { push } = useToast();
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  /* Written as a promise chain rather than async/await so the setState happens
     inside a callback — the shape the react-hooks rules accept, and the same one
     the rest of the app's data loading uses. */
  const refresh = useCallback(() => listReviews().then(setReviews), []);

  useEffect(() => {
    refresh();
    getAllProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [refresh]);

  /** Run an operation, report it, and reload. Everything on this screen changes
   *  the live site, so nothing is optimistic — she sees the real state back. */
  const run = useCallback(
    async (key: string, op: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
      setBusy(key);
      const res = await op();
      setBusy(null);
      if (res.ok) {
        push(done, "success");
        await refresh();
      } else {
        push(errorText(res.error), "error");
      }
      return res.ok;
    },
    [push, refresh],
  );

  const pending = useMemo(() => (reviews ?? []).filter((r) => r.status === "pending"), [reviews]);
  const wall = useMemo(
    () =>
      (reviews ?? [])
        .filter((r) => r.wallRank)
        .sort((a, b) => (a.wallRank ?? 0) - (b.wallRank ?? 0)),
    [reviews],
  );
  const featurable = useMemo(
    () => (reviews ?? []).filter((r) => r.status === "approved" && !r.wallRank),
    [reviews],
  );

  if (reviews === null) {
    return (
      <section className={cardCls}>
        <p className="text-[14px] text-muted">Loading reviews…</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* 01 — the queue */}
      <section className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>Moderation</Eyebrow>
          {pending.length > 0 && (
            <StatusBadge tone="pending">
              {pending.length} waiting on you
            </StatusBadge>
          )}
        </div>
        <div className="mt-3">
          <StepHeader
            n="01"
            title="Waiting on you"
            desc="Nothing a customer writes appears on the site until you approve it here."
          />
        </div>
        {pending.length === 0 ? (
          <p className="text-[14px] leading-[22px] text-muted">
            Nothing waiting. New reviews land here the moment a customer writes one.
          </p>
        ) : (
          <ul className="space-y-4">
            {pending.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r}>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => run(r.id, () => approveReview(r.id), "Approved — it's on the site now.")}
                    className={dangerBtn}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => run(r.id, () => hideReview(r.id), "Hidden. Nobody will see it.")}
                    className={secondaryBtn}
                  >
                    Hide
                  </button>
                  <DeleteButton review={r} busy={busy === r.id} run={run} />
                </ReviewCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 02 — the wall */}
      <section className={cardCls}>
        <Eyebrow>Homepage</Eyebrow>
        <div className="mt-3">
          <StepHeader
            n="02"
            title="The nine on the homepage"
            desc="Your picks fill the wall from the start, and the notes already written fill whatever's left. You never end up with an empty section."
          />
        </div>

        <p className="mb-5 flex items-start gap-2.5 rounded-btn border border-accent/25 bg-accent-tint-soft/30 p-4 text-[13px] leading-[20px] text-body">
          <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>
            On a computer the wall reads down each column, not across. So 1–3 are the{" "}
            <strong className="font-medium text-white">left column</strong>, 4–6 the middle and 7–9
            the right. On a phone it's a simple left-to-right swipe, so 1 is just first.
          </span>
        </p>

        {/* Fills DOWN each column, exactly like the wall it previews: CSS columns
            on the homepage are column-major, so a row-major picker here would
            teach her the wrong mental model. On a phone it stacks 1..9, which is
            also what the phone rail does. */}
        <div className="grid grid-cols-1 gap-3 sm:auto-cols-fr sm:grid-flow-col sm:grid-rows-3">
          {Array.from({ length: WALL_SIZE }, (_, i) => {
            const r = wall[i];
            const column = i < 3 ? "Left column" : i < 6 ? "Middle column" : "Right column";
            return (
              <div
                key={i}
                className={`rounded-btn border p-3.5 ${r ? "border-line-strong bg-white/[0.03]" : "border-line border-dashed"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] tracking-[0.16em] text-faint uppercase">
                    {i + 1} · {column}
                  </span>
                  {r?.verified && (
                    <span className="text-[10px] tracking-[0.12em] text-accent uppercase">
                      Verified
                    </span>
                  )}
                </div>
                {r ? (
                  <>
                    <p className="mt-2 truncate text-[14px] font-medium text-white">{r.author}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-[17px] text-muted">
                      {r.title}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <MoveButton
                        label="Move earlier"
                        glyph="↑"
                        disabled={i === 0 || busy === "wall"}
                        onClick={() => run("wall", () => reorderWall(swap(wall.map((w) => w.id), i, i - 1)), "Moved.")}
                      />
                      <MoveButton
                        label="Move later"
                        glyph="↓"
                        disabled={i === wall.length - 1 || busy === "wall"}
                        onClick={() => run("wall", () => reorderWall(swap(wall.map((w) => w.id), i, i + 1)), "Moved.")}
                      />
                      <button
                        type="button"
                        disabled={busy === "wall"}
                        onClick={() => run("wall", () => unfeatureReview(r.id), "Taken off the wall.")}
                        className="ml-auto cursor-pointer text-[12px] text-faint underline underline-offset-2 transition-colors hover:text-white disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-[12px] leading-[17px] text-faint">
                    One of the written notes fills this.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {featurable.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-[11px] tracking-[0.16em] text-faint uppercase">
              Approved, not on the wall
            </p>
            <ul className="mt-3 space-y-2">
              {featurable.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-btn border border-line px-3.5 py-2.5"
                >
                  <RatingStars rating={r.rating} size={13} />
                  <span className="text-[13px] font-medium text-white">{r.author}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{r.title}</span>
                  <button
                    type="button"
                    disabled={busy === "wall" || wall.length >= WALL_SIZE}
                    onClick={() => run("wall", () => featureReview(r.id), "Added to the wall.")}
                    className="cursor-pointer text-[12px] text-accent underline underline-offset-2 disabled:cursor-not-allowed disabled:text-faint disabled:no-underline"
                  >
                    {wall.length >= WALL_SIZE ? "Wall is full" : "Add to wall"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 03 — her own */}
      <OwnerReviewForm products={products} onCreated={refresh} />

      {/* 04 — everything else */}
      <section className={cardCls}>
        <Eyebrow>Records</Eyebrow>
        <div className="mt-3">
          <StepHeader
            n="04"
            title="Every review"
            desc="Approved and hidden reviews, newest first. Changes show on the site within a minute."
          />
        </div>
        {reviews.length === 0 ? (
          <p className="text-[14px] text-muted">No reviews yet.</p>
        ) : (
          <ul className="space-y-4">
            {reviews
              .filter((r) => r.status !== "pending")
              .map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r}>
                    {r.status === "approved" ? (
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => run(r.id, () => hideReview(r.id), "Hidden.")}
                        className={secondaryBtn}
                      >
                        Hide
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => run(r.id, () => approveReview(r.id), "Back on the site.")}
                        className={secondaryBtn}
                      >
                        Put back
                      </button>
                    )}
                    <DeleteButton review={r} busy={busy === r.id} run={run} />
                  </ReviewCard>
                </li>
              ))}
          </ul>
        )}

        <div className="mt-7 border-t border-line pt-6">
          <p className="text-[13px] leading-[20px] text-muted">
            If a star rating on a product page ever looks wrong, this recalculates every one of them
            from the reviews above.
          </p>
          <button
            type="button"
            disabled={busy === "resync"}
            onClick={() => run("resync", () => resyncRatings(), "Star ratings recalculated.")}
            className={`mt-3 ${secondaryBtn}`}
          >
            {busy === "resync" ? "Recalculating…" : "Recalculate star ratings"}
          </button>
        </div>
      </section>
    </div>
  );
}

/* --- pieces ---------------------------------------------------------------- */

function swap(ids: string[], a: number, b: number): string[] {
  const next = [...ids];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function MoveButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 cursor-pointer place-items-center rounded-full border border-line text-[13px] text-body transition-colors hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}

function ReviewCard({ review, children }: { review: AdminReview; children: React.ReactNode }) {
  return (
    <article className="rounded-btn border border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={TONE[review.status]}>{LABEL[review.status]}</StatusBadge>
        {review.source === "owner" && <StatusBadge tone="auto">Yours</StatusBadge>}
        {review.verified && <StatusBadge tone="auto">Verified buyer</StatusBadge>}
        <span className="ml-auto text-[12px] text-faint">{review.submitted}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <RatingStars rating={review.rating} size={14} />
        <span className="text-[14px] font-medium text-white">{review.author}</span>
        {review.maskedEmail && <span className="text-[12px] text-faint">{review.maskedEmail}</span>}
      </div>

      <p className="mt-2 text-[15px] font-medium text-white">{review.title}</p>
      <p className="mt-1 text-[14px] leading-[22px] text-body">{review.body}</p>

      <p className="mt-2 text-[12px] text-faint">
        {review.productName ?? review.productHandle ?? "Unknown piece"}
      </p>

      {review.photos && review.photos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.photos.map((src) => (
            <img
              key={src}
              src={cdnResize(src, 240)}
              alt=""
              loading="lazy"
              className="size-16 shrink-0 rounded-btn object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">{children}</div>
    </article>
  );
}

function DeleteButton({
  review,
  busy,
  run,
}: {
  review: AdminReview;
  busy: boolean;
  run: (
    key: string,
    op: () => Promise<{ ok: boolean; error?: string }>,
    done: string,
  ) => Promise<boolean>;
}) {
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState("");

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="ml-auto cursor-pointer text-[12px] text-faint underline underline-offset-2 transition-colors hover:text-white"
      >
        Delete
      </button>
    );
  }
  return (
    <div className="mt-1 w-full rounded-btn border border-accent/30 bg-accent-tint-soft/25 p-3.5">
      <p className="text-[13px] leading-[20px] text-body">
        Deleting removes this review and its photos for good. Hiding it is usually what you want —
        that takes it off the site but keeps it here. Enter your password to delete.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className={`${inputCls} max-w-[240px]`}
        />
        <button
          type="button"
          disabled={busy || !password}
          onClick={async () => {
            const ok = await run(review.id, () => deleteReview(review.id, password), "Deleted.");
            setPassword("");
            if (ok) setAsking(false);
          }}
          className={dangerBtn}
        >
          Delete for good
        </button>
        <button
          type="button"
          onClick={() => {
            setAsking(false);
            setPassword("");
          }}
          className="cursor-pointer text-[12px] text-faint underline underline-offset-2 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function OwnerReviewForm({
  products,
  onCreated,
}: {
  products: Product[];
  onCreated: () => Promise<void>;
}) {
  const { push } = useToast();
  const [productId, setProductId] = useState("");
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const product = products.find((p) => p.id === productId);
  const ready = productId && author.trim() && title.trim() && body.trim() && !saving;

  const onPhotoError = useCallback(
    (message: string) => push(message, "error"),
    [push],
  );
  const { photos, tokens, uploading, addFiles, remove, reset } = useReviewPhotos({
    max: MAX_PHOTOS,
    /* No invite token: her admin session is the proof. */
    onError: onPhotoError,
    errorText,
  });

  async function pick(files: FileList | null) {
    await addFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!ready) return;
    setSaving(true);
    const res = await createOwnerReview({
      productGid: productId,
      productName: product?.name,
      productHandle: product?.slug,
      author: author.trim(),
      title: title.trim(),
      body: body.trim(),
      rating,
      verified: true,
      photoTokens: tokens,
    });
    setSaving(false);
    if (!res.ok) {
      push(errorText(res.error), "error");
      return;
    }
    push("Added, and it's on the site.", "success");
    setAuthor("");
    setTitle("");
    setBody("");
    setRating(5);
    reset();
    await onCreated();
  }

  const over = body.length > BODY_SOFT_LIMIT;

  return (
    <section className={cardCls}>
      <Eyebrow>Your own</Eyebrow>
      <div className="mt-3">
        <StepHeader
          n="03"
          title="Type up a review someone sent you"
          desc="For the ones that arrive on Instagram or WhatsApp. These go straight on the site — no approving needed, since you're the one adding them."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Which piece is it about?">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputCls}
          >
            <option value="">Choose a piece…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Who wrote it?" hint="First name is plenty">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={40}
            placeholder="Priya"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="How many stars?">
          <div className="pt-1.5">
            <RatingInput value={rating} onChange={setRating} name="owner-review-rating" />
          </div>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Headline" hint="What the note leads with">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Wore it to my cousin's engagement"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field
          label="What they said"
          hint={
            over
              ? `${body.length} characters — long notes make the homepage wall uneven`
              : `${body.length} / ${BODY_SOFT_LIMIT}`
          }
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
            rows={5}
            placeholder="Paste what they wrote, in their words."
            className={`${inputCls} h-auto py-3 leading-[22px] ${over ? "border-accent/50" : ""}`}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field
          label="Photos"
          hint={`${photos.length} of ${MAX_PHOTOS} — resized on your device before upload`}
        >
          <div className="flex flex-wrap items-center gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative">
                <img
                  src={p.preview}
                  alt=""
                  className={`size-20 rounded-btn object-cover ${p.uploading ? "opacity-50" : ""} ${p.error ? "opacity-40 grayscale" : ""}`}
                />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => remove(p.id)}
                  className="absolute -top-2 -right-2 grid size-6 cursor-pointer place-items-center rounded-full border border-line bg-page text-[12px] text-body hover:text-white"
                >
                  <span aria-hidden>×</span>
                </button>
                {p.error && (
                  <p className="mt-1 max-w-20 text-[10px] leading-[13px] text-accent">{p.error}</p>
                )}
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  /* Explicit rather than image/*: on iOS Safari image/* lets
                     through a HEIC that the canvas can't decode. */
                  accept={ACCEPTED_TYPES}
                  multiple
                  onChange={(e) => pick(e.target.files)}
                  className="sr-only"
                  id="owner-review-photos"
                />
                <label
                  htmlFor="owner-review-photos"
                  className="grid size-20 cursor-pointer place-items-center rounded-btn border border-dashed border-line text-[11px] text-faint transition-colors hover:border-line-strong hover:text-body"
                >
                  Add
                </label>
              </>
            )}
          </div>
        </Field>
      </div>

      <button
        type="button"
        disabled={!ready || uploading}
        onClick={submit}
        className={`mt-6 ${dangerBtn}`}
      >
        {saving ? "Adding…" : uploading ? "Waiting for photos…" : "Add this review"}
      </button>
      <p className="mt-3 text-[12px] text-faint">
        It appears on {product ? product.name : "the piece"}&rsquo;s page within a minute. Put it on
        the homepage from the wall above.
      </p>
    </section>
  );
}

/** Server error codes, said in plain language. */
function errorText(code?: string): string {
  switch (code) {
    case "reviews_not_configured":
      return "Reviews aren't switched on for this site yet.";
    case "password_required":
      return "Password incorrect — try again.";
    case "wall_full":
      return "All nine homepage spots are taken. Remove one first.";
    case "missing_fields":
      return "Fill in the name, headline and what they said.";
    case "bad_product":
      return "Choose which piece the review is about.";
    case "bad_rating":
      return "Pick a star rating.";
    case "upload_pending":
      return "Shopify is still processing that photo — add it again in a moment.";
    case "image_too_large":
      return "That photo is too big.";
    case "not_an_image":
      return "That file isn't an image.";
    case "rate_limited":
      return "Too many photos at once — wait a moment.";
    case "upload_failed":
      return "The photo couldn't be uploaded. Check the app's file permissions.";
    case "not_found":
      return "That review is already gone.";
    case "network":
      return "Couldn't reach the server. Check your connection.";
    default:
      return "Something went wrong. Try again.";
  }
}
