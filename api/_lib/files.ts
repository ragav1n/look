/**
 * Uploading an image to Shopify Files.
 *
 * Review photos live on cdn.shopify.com rather than in Mongo, for three reasons:
 * the CSP already allows that host (`img-src 'self' data: https://cdn.shopify.com`)
 * so no policy change is needed, the CDN resizes on demand via `?width=N` so one
 * stored file serves the wall avatar, the PDP thumbnail and the lightbox, and the
 * client can see review photos under Content → Files beside her product shots.
 * GridFS would cost an invocation and egress on every view, with no CDN and no
 * variants.
 *
 * The upload runs HERE, in the function, and not in the browser. `form-action
 * 'self'` and our narrow `connect-src` block a browser-initiated staged upload
 * outright; a server has no CSP.
 *
 * Needs the read_files + write_files Admin API scopes.
 */
import { adminGraphql } from "./shopify.js";

const STAGED = /* GraphQL */ `
  mutation ReviewPhotoStage($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }
`;

const CREATE = /* GraphQL */ `
  mutation ReviewPhotoCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id fileStatus ... on MediaImage { image { url width height } } }
      userErrors { field message }
    }
  }
`;

const POLL = /* GraphQL */ `
  query ReviewPhotoStatus($id: ID!) {
    node(id: $id) {
      ... on MediaImage { id fileStatus image { url width height } }
    }
  }
`;

export interface UploadedFile {
  gid: string;
  /** Null when Shopify is still processing — poll again or resolve lazily. */
  url: string | null;
}

interface UserError {
  field?: string[] | null;
  message: string;
}

interface GqlEnvelope {
  errors?: { message: string; extensions?: { code?: string } }[];
}

const firstError = (errs: UserError[] | undefined | null): string | null =>
  errs && errs.length ? errs.map((e) => e.message).join("; ") : null;

/**
 * Surface TOP-LEVEL GraphQL errors, which is where a missing access scope shows
 * up — as `ACCESS_DENIED`, with `data` null and userErrors empty. Without this
 * the caller only sees "returned no target", which says nothing about the actual
 * cause and costs someone an afternoon. Uploading needs read_files + write_files
 * on the custom app, which must be re-released and re-installed after the scopes
 * are added.
 */
function topError(json: GqlEnvelope, op: string): string | null {
  const errs = json.errors;
  if (!errs?.length) return null;
  const denied = errs.some((e) => e.extensions?.code === "ACCESS_DENIED");
  const detail = errs.map((e) => e.message).join("; ");
  return denied
    ? `${op}: ${detail} — the app is missing the read_files/write_files scopes, or has not been re-installed since they were added.`
    : `${op}: ${detail}`;
}

/**
 * Detect the image type from its MAGIC BYTES rather than trusting the declared
 * MIME, which is attacker-controlled. Returns null for anything we won't accept.
 *
 * HEIC is deliberately absent: the browser re-encodes to JPEG on a canvas before
 * uploading, so a file arriving here has already been through a decoder.
 */
export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/**
 * Put one image into Shopify Files and hand back its GID and CDN url.
 *
 * Three round trips, which is simply what Shopify requires: reserve a staged
 * target, PUT the bytes to the bucket it names, then register the uploaded
 * resource as a File.
 */
export async function uploadImage(
  bytes: Buffer,
  filename: string,
  mime: string,
): Promise<UploadedFile> {
  /* 1. Reserve a staged target. */
  const stagedRes = await adminGraphql(STAGED, {
    input: [
      {
        resource: "FILE",
        filename,
        mimeType: mime,
        httpMethod: "POST",
        fileSize: String(bytes.length),
      },
    ],
  });
  const stagedJson = (await stagedRes.json()) as GqlEnvelope & {
    data?: {
      stagedUploadsCreate?: {
        stagedTargets?: {
          url: string;
          resourceUrl: string;
          parameters: { name: string; value: string }[];
        }[];
        userErrors?: UserError[];
      };
    };
  };
  const top1 = topError(stagedJson, "stagedUploadsCreate");
  if (top1) throw new Error(top1);
  const err1 = firstError(stagedJson.data?.stagedUploadsCreate?.userErrors);
  if (err1) throw new Error(`stagedUploadsCreate: ${err1}`);
  const target = stagedJson.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) throw new Error("stagedUploadsCreate returned no target");

  /* 2. POST the bytes. EVERY parameter Shopify handed back must be appended
        BEFORE the file field — Google's bucket rejects the form otherwise.
        Node 20 has global FormData/Blob, so no multipart dependency. */
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), filename);
  const put = await fetch(target.url, { method: "POST", body: form });
  if (!put.ok) {
    throw new Error(`staged upload failed: HTTP ${put.status} ${(await put.text()).slice(0, 200)}`);
  }

  /* 3. Register it as a File. */
  const createRes = await adminGraphql(CREATE, {
    files: [{ originalSource: target.resourceUrl, contentType: "IMAGE", alt: "Customer review photo" }],
  });
  const createJson = (await createRes.json()) as GqlEnvelope & {
    data?: {
      fileCreate?: {
        files?: { id: string; fileStatus: string; image?: { url?: string } | null }[];
        userErrors?: UserError[];
      };
    };
  };
  const top2 = topError(createJson, "fileCreate");
  if (top2) throw new Error(top2);
  const err2 = firstError(createJson.data?.fileCreate?.userErrors);
  if (err2) throw new Error(`fileCreate: ${err2}`);
  const file = createJson.data?.fileCreate?.files?.[0];
  if (!file?.id) throw new Error("fileCreate returned no file");

  return { gid: file.id, url: file.image?.url ?? (await waitForUrl(file.id)) };
}

/**
 * `image.url` is null until Shopify finishes processing the upload, so poll
 * briefly for it.
 *
 * Gives up after ~3s and returns null rather than holding the request open: the
 * GID is already enough to find the file again, and the admin read resolves a
 * pending url lazily. A customer waiting on a spinner is worse than a photo that
 * appears a moment later in the moderation queue.
 */
async function waitForUrl(gid: string, attempts = 8, delayMs = 400): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const url = await readFileUrl(gid);
    if (url) return url;
  }
  return null;
}

/** The CDN url for a File, or null while it is still processing. */
export async function readFileUrl(gid: string): Promise<string | null> {
  const res = await adminGraphql(POLL, { id: gid });
  const json = (await res.json()) as {
    data?: { node?: { fileStatus?: string; image?: { url?: string } | null } | null };
  };
  return json.data?.node?.image?.url ?? null;
}

const DELETE = /* GraphQL */ `
  mutation ReviewPhotoDelete($ids: [ID!]!) {
    fileDelete(fileIds: $ids) { deletedFileIds userErrors { field message } }
  }
`;

/** Remove files from Shopify Files. Best-effort: a review being deleted from the
 *  database matters more than an orphaned image, which she can also clear by
 *  hand under Content → Files. */
export async function deleteFiles(gids: string[]): Promise<void> {
  if (!gids.length) return;
  try {
    const res = await adminGraphql(DELETE, { ids: gids });
    const json = (await res.json()) as { data?: { fileDelete?: { userErrors?: UserError[] } } };
    const err = firstError(json.data?.fileDelete?.userErrors);
    if (err) console.error("[reviews] fileDelete:", err);
  } catch (err) {
    console.error("[reviews] fileDelete failed:", err);
  }
}
