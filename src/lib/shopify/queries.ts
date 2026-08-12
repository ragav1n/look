/** GraphQL documents for the Storefront API. */

export const PRODUCT_FRAGMENT = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    productType
    tags
    createdAt
    publishedAt
    availableForSale
    vendor
    totalInventory
    priceRange { minVariantPrice { amount currencyCode } }
    compareAtPriceRange { minVariantPrice { amount currencyCode } }
    featuredImage { url altText }
    images(first: 8) { nodes { url altText } }
    options { name values }
    collections(first: 50) { nodes { handle } }
    heroTagline: metafield(namespace: "custom", key: "hero_tagline") { value }
    # 250 is the Storefront maximum. At 50, the unbounded "options" field still
    # rendered the full size/colour grid while "variants" was truncated, so
    # valid combinations resolved to undefined and the product could not be
    # bought — 9 sizes x 6 colours = 54 is reachable with this size scale.
    variants(first: 250) {
      nodes {
        id
        title
        sku
        availableForSale
        quantityAvailable
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        selectedOptions { name value }
      }
    }
  }
`;

export const PRODUCTS_QUERY = /* GraphQL */ `
  ${PRODUCT_FRAGMENT}
  query Products($first: Int!, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse) {
      nodes { ...ProductFields }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  ${PRODUCT_FRAGMENT}
  query ProductByHandle($handle: String!) {
    product(handle: $handle) { ...ProductFields }
  }
`;

export const COLLECTION_PRODUCTS_QUERY = /* GraphQL */ `
  ${PRODUCT_FRAGMENT}
  query CollectionProducts($handle: String!, $first: Int!, $sortKey: ProductCollectionSortKeys) {
    collection(handle: $handle) {
      products(first: $first, sortKey: $sortKey) {
        nodes { ...ProductFields }
      }
    }
  }
`;

/** Category tiles. `products(first: 1)` supplies a fallback image for
 *  collections the admin never gave an image to. */
export const COLLECTIONS_QUERY = /* GraphQL */ `
  query Collections($first: Int!) {
    collections(first: $first) {
      nodes {
        id
        handle
        title
        image { url altText }
        products(first: 1) {
          nodes { featuredImage { url altText } }
        }
      }
    }
  }
`;

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
      totalDutyAmount { amount currencyCode }
    }
    # Shopify's own verdict on each code. A code it cannot honour comes back
    # here with applicable:false and NO userError — see applyDiscount.
    discountCodes { code applicable }
    # Order-level discounts. Only discountedAmount on purpose: this fragment
    # backs the cart query AND all five mutations, so a field that fails to
    # resolve breaks add-to-cart on every page. The code that earned the money
    # is already in discountCodes above, and inline fragments on the allocation
    # interface shift between API versions.
    discountAllocations { discountedAmount { amount currencyCode } }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount { amount currencyCode }
          amountPerQuantity { amount currencyCode }
        }
        # Product-scoped discounts land here instead, and Shopify has already
        # taken them out of cost.totalAmount and cart.cost.subtotalAmount.
        discountAllocations { discountedAmount { amount currencyCode } }
        merchandise {
          ... on ProductVariant {
            id
            title
            image { url altText }
            # Lets the cart's stepper cap itself at what's actually on the shelf
            # instead of leaving Shopify to reject the line at checkout.
            quantityAvailable
            selectedOptions { name value }
            product { handle title featuredImage { url altText } }
          }
        }
      }
    }
  }
`;

export const CART_QUERY = /* GraphQL */ `
  ${CART_FRAGMENT}
  query Cart($id: ID!) {
    cart(id: $id) { ...CartFields }
  }
`;

export const CART_CREATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartCreate($lines: [CartLineInput!], $discountCodes: [String!]) {
    cartCreate(input: { lines: $lines, discountCodes: $discountCodes }) {
      cart { ...CartFields }
      userErrors { message }
    }
  }
`;

/** Replace the cart's discount codes; [] clears them.
 *
 *  Always SETS the list rather than appending to it. Shopify allows one code
 *  per order unless the discounts are configured to combine, and appending to a
 *  cart that already has one silently flips the earlier code to
 *  applicable:false instead of refusing — so a shopper would watch their first
 *  discount evaporate with no explanation. */
export const CART_DISCOUNT_CODES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart { ...CartFields }
      userErrors { message }
    }
  }
`;

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { message }
    }
  }
`;

export const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { message }
    }
  }
`;

export const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { message }
    }
  }
`;

/** Resolve product GIDs to handles. Order line items from the Customer Account
 *  API carry a productId but no handle, so this is how an ordered item finds
 *  its way back to a product page. */
export const PRODUCT_HANDLES_QUERY = /* GraphQL */ `
  query ProductHandles($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        handle
      }
    }
  }
`;

/** Homepage "Straight From Our Reels" cards. Sourced from the `reel` metaobject
 *  so the store admin owns each card's image, caption and Instagram post link.
 *  The definition must have Storefront access enabled or this query errors (the
 *  section then simply hides). `image` is a file_reference resolving to a
 *  MediaImage — the project's first such reference. */
export const REELS_QUERY = /* GraphQL */ `
  query Reels($first: Int!) {
    metaobjects(type: "reel", first: $first) {
      nodes {
        id
        image: field(key: "image") {
          reference {
            ... on MediaImage { image { url altText } }
          }
        }
        caption: field(key: "caption") { value }
        link: field(key: "link") { value }
        position: field(key: "position") { value }
      }
    }
  }
`;

/** The store's promotions, from the `promo` metaobject, so the admin owns the
 *  code, every word of the campaign and which surfaces carry it. Like `reel`,
 *  the definition must have Storefront access enabled or this query errors.
 *
 *  All of them are fetched rather than "the live one": Shopify can't filter
 *  metaobjects by field value, so `getPromo` picks the winner. Ten is more
 *  entries than a store this size will ever keep around, and it leaves room to
 *  stage the next campaign beside the current one. */
export const PROMO_QUERY = /* GraphQL */ `
  query Promo($first: Int!) {
    metaobjects(type: "promo", first: $first) {
      nodes {
        id
        active: field(key: "active") { value }
        code: field(key: "code") { value }
        showBar: field(key: "show_bar") { value }
        showTicker: field(key: "show_ticker") { value }
        showPoster: field(key: "show_poster") { value }
        showCart: field(key: "show_cart") { value }
        barText: field(key: "bar_text") { value }
        tickerText: field(key: "ticker_text") { value }
        headline: field(key: "headline") { value }
        script: field(key: "script") { value }
        lines: field(key: "lines") { value }
        ctaPath: field(key: "cta_path") { value }
        startsAt: field(key: "starts_at") { value }
        endsAt: field(key: "ends_at") { value }
      }
    }
  }
`;
