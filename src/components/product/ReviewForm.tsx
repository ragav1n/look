/**
 * The form a customer writes a review in, inside the shared Modal.
 *
 * Only rendered for someone who may actually review the piece — the product page
 * asks first and doesn't offer the button otherwise, so this never has to tell
 * anyone they aren't allowed.
 *
 * The copy in here has a different job from the console's version of the same
 * fields: it says what happens next ("we read every one before it goes up") so
 * nobody files a review and then waits, refreshing, for it to appear. Same error
 * codes as AdminReviews, said differently, because the audiences are different.
 */
import { useId, useRef, useState } from "react";
import type { Product } from "@/types";
import { submitReview } from "@/lib/reviews";
import { ACCEPTED_TYPES } from "@/lib/reviewPhoto";
import { useReviewPhotos } from "@/hooks/useReviewPhotos";
import Modal from "@/components/ui/Modal";
import RatingInput from "@/components/ui/RatingInput";
import Button from "@/components/ui/Button";

const MAX_PHOTOS = 5;
const BODY_MAX = 1200;

export default function ReviewForm({
  product,
  open,
  onClose,
  inviteToken,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
  /** The `?review=` value from a review-request email, when they arrived that way. */
  inviteToken?: string;
}) {
  const fieldId = useId();
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ready = author.trim() && title.trim() && body.trim() && rating > 0 && !busy;

  const { photos, tokens, uploading, addFiles, remove, reset } = useReviewPhotos({
    max: MAX_PHOTOS,
    productGid: product.id,
    inviteToken,
    onError: setError,
    errorText: shopperError,
  });

  async function pick(files: FileList | null) {
    setError(null);
    await addFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const res = await submitReview({
      productGid: product.id,
      productName: product.name,
      productHandle: product.slug,
      author: author.trim(),
      title: title.trim(),
      body: body.trim(),
      rating,
      token: inviteToken,
      /* Only photos that came back signed. A failed upload is dropped here
         rather than sent, since the server would refuse the whole review. */
      photoTokens: tokens,
      honeypot,
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(shopperError(res.error));
  }

  function close() {
    onClose();
    /* Reset only after a successful send, so a network failure doesn't throw
       away what they typed. */
    if (done) {
      setDone(false);
      setAuthor("");
      setTitle("");
      setBody("");
      setRating(0);
      reset();
      setError(null);
    }
  }

  const input =
    "h-[46px] w-full rounded-btn border border-line bg-surface px-4 text-[14px] text-white placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15";

  return (
    <Modal open={open} onClose={close} label="Write a review" maxWidth="max-w-[560px]">
      <div className="p-6 sm:p-8">
        {done ? (
          <div className="text-center">
            <p className="text-[12px] tracking-[0.18em] text-accent uppercase">Thank you</p>
            <h2 className="mt-3 font-display text-[26px] leading-[1.15] font-medium text-white">
              That&rsquo;s with us
            </h2>
            <p className="mx-auto mt-3 max-w-[380px] text-[14px] leading-[22px] text-body">
              We read every review before it goes up, so it won&rsquo;t appear straight away. Thank
              you for taking the time.
            </p>
            <Button onClick={close} className="mt-7">
              Close
            </Button>
          </div>
        ) : (
          <>
            <p className="text-[12px] tracking-[0.18em] text-accent uppercase">Your review</p>
            <h2 className="mt-2 font-display text-[24px] leading-[1.15] font-medium text-white">
              {product.name}
            </h2>
            <p className="mt-2 text-[13px] leading-[20px] text-muted">
              We read every review before it goes up. Photos are resized on your phone first, so
              nothing large gets uploaded.
            </p>

            <div className="mt-6">
              <span className="mb-2 block text-[13px] font-medium text-body">
                How many stars?
              </span>
              <RatingInput value={rating} onChange={setRating} name={`${fieldId}-rating`} />
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-medium text-body" htmlFor={`${fieldId}-name`}>
                Your name
              </label>
              <input
                id={`${fieldId}-name`}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={40}
                autoComplete="given-name"
                placeholder="First name is plenty"
                className={input}
              />
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-medium text-body" htmlFor={`${fieldId}-title`}>
                Sum it up
              </label>
              <input
                id={`${fieldId}-title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Wore it to my cousin's engagement"
                className={input}
              />
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-medium text-body" htmlFor={`${fieldId}-body`}>
                How was it?
              </label>
              <textarea
                id={`${fieldId}-body`}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                rows={5}
                placeholder="How it fits, how the fabric feels, where you wore it. Whatever you'd tell a friend."
                className={`${input} h-auto py-3 leading-[22px]`}
              />
            </div>

            <div className="mt-5">
              <span className="mb-2 block text-[13px] font-medium text-body">
                Photos <span className="font-normal text-faint">(optional, up to {MAX_PHOTOS})</span>
              </span>
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
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <>
                    <input
                      ref={fileRef}
                      id={`${fieldId}-photos`}
                      type="file"
                      /* Explicit, not image/*: on iOS Safari image/* lets through
                         a HEIC the canvas can't decode. */
                      accept={ACCEPTED_TYPES}
                      multiple
                      onChange={(e) => pick(e.target.files)}
                      className="sr-only"
                    />
                    <label
                      htmlFor={`${fieldId}-photos`}
                      className="grid size-20 cursor-pointer place-items-center rounded-btn border border-dashed border-line text-[11px] text-faint transition-colors hover:border-line-strong hover:text-body"
                    >
                      Add
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* The trap. Hidden from people and from screen readers; a bot fills
                it in and the server drops the submission without saying so.
                Named contact_reason so a browser won't autofill it. */}
            <div aria-hidden className="hidden">
              <label htmlFor={`${fieldId}-cr`}>Contact reason</label>
              <input
                id={`${fieldId}-cr`}
                name="contact_reason"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="mt-5 text-[13px] leading-[20px] text-accent">
                {error}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button onClick={submit} disabled={!ready || uploading}>
                {busy ? "Sending…" : uploading ? "Waiting for photos…" : "Send review"}
              </Button>
              <button
                type="button"
                onClick={close}
                className="cursor-pointer text-[13px] text-muted underline underline-offset-2 transition-colors hover:text-white"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/** The server's error codes, in a shopper's language. */
function shopperError(code?: string): string {
  switch (code) {
    case "already_reviewed":
      return "You've already reviewed this piece. Thank you!";
    case "not_eligible":
      return "We couldn't confirm this order. Use the link from your delivery email, or sign in.";
    case "rate_limited":
      return "That's a few too many at once. Please try again in a minute.";
    case "bad_photo":
      return "One of the photos didn't upload properly. Remove it and try again.";
    case "too_many_photos":
      return `Up to ${MAX_PHOTOS} photos, please.`;
    case "upload_pending":
      return "That photo is still being processed. Please try adding it again.";
    case "image_too_large":
      return "That photo is too large, even after resizing.";
    case "not_an_image":
      return "That file isn't a photo.";
    case "missing_fields":
      return "Please fill in your name, a summary, and how it was.";
    case "bad_rating":
      return "Please choose a star rating.";
    case "reviews_not_configured":
    case "server_error":
      return "Something went wrong at our end. Please try again shortly.";
    case "network":
      return "Couldn't reach us. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
