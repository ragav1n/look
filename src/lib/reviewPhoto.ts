/**
 * Shrinking a phone photo before it is uploaded with a review.
 *
 * An untouched phone photo is 8–12MB; what we want is around 180KB. Doing it in
 * the browser means the customer's upload is fast on a phone connection and the
 * function never handles megabytes.
 *
 * TWO CSP RULES SHAPE THIS FILE, and both fail only in production — the local
 * dev server sets no CSP at all, so a mistake here looks fine until it's live:
 *
 *   1. NEVER create an object URL. `blob:` is not in our `img-src`, and that
 *      applies to the DECODE path as much as the preview. `createImageBitmap`
 *      takes the File directly, so no URL is ever minted — and its
 *      `imageOrientation: "from-image"` applies the EXIF rotation, which is why
 *      portrait phone photos don't land sideways.
 *   2. The canvas emits a `data:` URL, which `img-src` already allows. So the
 *      preview is free, and the net CSP change for this whole feature is zero.
 *
 * Re-encoding also strips ALL EXIF — including the GPS coordinates that a photo
 * of a dress tried on at home routinely carries. That is a privacy win worth
 * keeping deliberately, so the original bytes are never passed through.
 */

/** One stored file per photo, at this size. The largest surface is the lightbox
 *  and a phone at DPR 3 needs about 1170px, so this is the ceiling; every
 *  smaller surface asks cdn.shopify.com for a variant via cdnResize(). */
const MAX_EDGE = 1200;

/** Comfortably under the endpoint's own cap, with room for base64's ~33%. */
const TARGET_BYTES = 900_000;

/** Stepping down rather than binary-searching: three encodes is quick, and 0.78
 *  is where a gingham check still looks like fabric rather than mush. */
const QUALITIES = [0.78, 0.7, 0.6];

export const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

export interface PreparedPhoto {
  /** A `data:image/jpeg;base64,…` URL — safe to render AND to upload. */
  dataUrl: string;
  bytes: number;
}

/** Roughly how many bytes a data: URL's payload decodes to. */
const decodedSize = (dataUrl: string): number => {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4);
};

/**
 * Decode, downscale and re-encode one image.
 *
 * Throws with a message meant for a shopper, not a log: this is the only place
 * that can tell them their photo won't work, and "couldn't read that image" is
 * more use than a stack trace.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    /* iOS Safari can hand over a HEIC even against an explicit accept list, and
       canvas can't decode it. This is that case, and a few genuinely corrupt
       files. */
    throw new Error("That image couldn't be read. A photo straight from your camera roll works best.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("That image couldn't be processed on this device.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  for (const q of QUALITIES) {
    const encoded = canvas.toDataURL("image/jpeg", q);
    const bytes = decodedSize(encoded);
    if (bytes <= TARGET_BYTES) return { dataUrl: encoded, bytes };
  }
  /* Still too big at the lowest quality we're willing to ship — a screenshot of
     a screenshot, usually. Better to say so than to upload something ugly. */
  throw new Error("That image is too large even after resizing. Try another photo.");
}
