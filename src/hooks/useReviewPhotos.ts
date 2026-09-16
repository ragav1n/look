import { useCallback, useState } from "react";
import { preparePhoto } from "@/lib/reviewPhoto";
import { uploadReviewPhoto } from "@/lib/reviews";

/**
 * Picking, shrinking and uploading the photos attached to a review.
 *
 * Shared by the shopper's form and the owner console, which differ only in how
 * they surface an error and whether they send an invite token. They used to
 * carry a copy each of this logic, which is how the same bug came to exist in
 * both: drafts were identified by their `preview` data URL, and
 * `canvas.toDataURL` is deterministic — so adding the same image twice produced
 * two indistinguishable rows, the first upload's token was stamped onto both,
 * the review shipped the same photo twice, and removing one thumbnail removed
 * both. Each draft now carries its own id.
 */
export interface DraftPhoto {
  /** Stable per draft, so two copies of one image stay separate. */
  id: string;
  /** A `data:` URL from preparePhoto. NEVER a blob: — our CSP forbids it. */
  preview: string;
  /** Present once the upload came back signed; only these get submitted. */
  token?: string;
  error?: string;
  uploading: boolean;
}

export interface UseReviewPhotos {
  photos: DraftPhoto[];
  /** Signed tokens only — a failed or pending upload is simply not submitted. */
  tokens: string[];
  /** True while any upload is in flight, so the form can hold off submitting. */
  uploading: boolean;
  addFiles: (files: FileList | null) => Promise<void>;
  remove: (id: string) => void;
  reset: () => void;
}

export function useReviewPhotos({
  max,
  productGid,
  inviteToken,
  onError,
  errorText,
}: {
  max: number;
  /** Sent with each upload so the server can check the caller may review it. */
  productGid?: string;
  inviteToken?: string;
  /** How the host surfaces a problem — a toast in the console, inline in the form. */
  onError: (message: string) => void;
  /** Turns a server error code into this audience's wording. */
  errorText: (code?: string) => string;
}): UseReviewPhotos {
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      /* Read the current length through the setter rather than the closure, so
         picking twice in quick succession can't overshoot the cap. */
      let room = max;
      setPhotos((cur) => {
        room = max - cur.length;
        return cur;
      });
      if (room <= 0) return;

      for (const file of Array.from(files).slice(0, room)) {
        let prepared;
        try {
          prepared = await preparePhoto(file);
        } catch (err) {
          onError(err instanceof Error ? err.message : "That photo couldn't be used.");
          continue;
        }
        const id = crypto.randomUUID();
        setPhotos((cur) => [...cur, { id, preview: prepared.dataUrl, uploading: true }]);

        const res = await uploadReviewPhoto(prepared.dataUrl, productGid, inviteToken);
        setPhotos((cur) =>
          cur.map((p) =>
            p.id === id
              ? "token" in res
                ? { ...p, token: res.token, uploading: false }
                : { ...p, error: errorText(res.error), uploading: false }
              : p,
          ),
        );
        if (!("token" in res)) onError(errorText(res.error));
      }
    },
    [max, productGid, inviteToken, onError, errorText],
  );

  const remove = useCallback((id: string) => {
    setPhotos((cur) => cur.filter((p) => p.id !== id));
  }, []);

  const reset = useCallback(() => setPhotos([]), []);

  return {
    photos,
    tokens: photos.map((p) => p.token).filter((t): t is string => Boolean(t)),
    uploading: photos.some((p) => p.uploading),
    addFiles,
    remove,
    reset,
  };
}
