/**
 * Admin-API operations for the new-drop digest: finding products that have gone
 * live but haven't been announced, and marking them announced afterwards.
 *
 * "Already announced" is a product TAG (`drop-announced`) rather than a hidden
 * flag, so the state is visible and reversible in the Shopify admin: remove the
 * tag to re-announce a product, add it by hand to suppress one. This is the same
 * Shopify-is-the-database trick the newsletter/account flags use.
 */
import { adminGraphql } from "./shopify.js";

/** Products carrying this tag have already gone out in a drop email. */
export const ANNOUNCED_TAG = "drop-announced";

/** Only announce genuinely recent uploads. A product tagged clean long ago
 *  (say the client removes the tag while editing) shouldn't resurface as "new". */
const NEW_WINDOW_DAYS = 30;

const DROP_PRODUCTS = /* GraphQL */ `
  query DropProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query, sortKey: PUBLISHED_AT, reverse: true) {
      edges {
        node {
          id
          handle
          title
          featuredImage { url altText }
          priceRangeV2 { minVariantPrice { amount currencyCode } }
        }
      }
    }
  }
`;

export interface DropProduct {
  id: string;
  handle: string;
  title: string;
  imageUrl?: string;
  minPrice: number;
  currencyCode: string;
}

/**
 * Products published within the window that haven't been announced yet, newest
 * first. `first` caps how many are fetched — the email shows only a handful, but
 * we tag every one returned so nothing published in a burst is announced twice.
 *
 * The filter uses a NEGATED tag (`-tag:drop-announced`) and a published_at
 * lower bound; both were confirmed against the live store before this shipped.
 */
export async function getUnannouncedDrops(first = 20): Promise<DropProduct[]> {
  const since = new Date(Date.now() - NEW_WINDOW_DAYS * 864e5).toISOString();
  const query = `status:active AND published_at:>'${since}' AND -tag:${ANNOUNCED_TAG}`;

  const res = await adminGraphql(DROP_PRODUCTS, { query, first });
  const json = (await res.json()) as {
    data?: {
      products?: {
        edges?: {
          node: {
            id: string;
            handle: string;
            title: string;
            featuredImage?: { url?: string | null } | null;
            priceRangeV2?: { minVariantPrice?: { amount?: string; currencyCode?: string } } | null;
          };
        }[];
      };
    };
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(`drop lookup failed: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  return (json.data?.products?.edges ?? []).map(({ node }) => ({
    id: node.id,
    handle: node.handle,
    title: node.title,
    imageUrl: node.featuredImage?.url ?? undefined,
    minPrice: Number(node.priceRangeV2?.minVariantPrice?.amount ?? 0),
    currencyCode: node.priceRangeV2?.minVariantPrice?.currencyCode ?? "INR",
  }));
}

const TAGS_ADD = /* GraphQL */ `
  mutation DropTag($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors { field message }
    }
  }
`;

/**
 * Tag products announced. Called ONLY after a successful send, so a send failure
 * leaves them un-tagged and they retry on the next run rather than being lost.
 * Returns the count actually tagged. Best-effort per product: a single failure
 * is logged but doesn't abort the rest.
 */
export async function markAnnounced(productIds: string[]): Promise<number> {
  let tagged = 0;
  for (const id of productIds) {
    try {
      const res = await adminGraphql(TAGS_ADD, { id, tags: [ANNOUNCED_TAG] });
      const json = (await res.json()) as {
        data?: { tagsAdd?: { userErrors?: { message: string }[] } };
      };
      const errs = json.data?.tagsAdd?.userErrors ?? [];
      if (errs.length) console.error(`[drops] tag ${id}:`, errs.map((e) => e.message).join("; "));
      else tagged++;
    } catch (err) {
      console.error(`[drops] tag ${id} threw:`, err);
    }
  }
  return tagged;
}
