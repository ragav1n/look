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
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount { amount currencyCode }
          amountPerQuantity { amount currencyCode }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            image { url altText }
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
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
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
