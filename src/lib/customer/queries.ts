/**
 * GraphQL documents for the Customer Account API, sent through the /api BFF.
 *
 * Field names here were checked against the 2026-07 schema rather than guessed —
 * a single wrong field fails the whole document, and this API differs from the
 * Storefront API in several places that look interchangeable but aren't:
 *   - addresses read `province` + `zoneCode` but write only `zoneCode`
 *   - the phone field is `phoneNumber`, not `phone`
 *   - there is no payment-method field anywhere, only a payment *status*
 *   - `LineItem` exposes `productId` but no handle, so product links need a
 *     separate Storefront lookup (see getProductHandles in shopify/catalog.ts)
 */

const MONEY_FRAGMENT = /* GraphQL */ `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

const ADDRESS_FRAGMENT = /* GraphQL */ `
  fragment AddressFields on CustomerAddress {
    id
    firstName
    lastName
    address1
    address2
    city
    province
    zoneCode
    zip
    phoneNumber
    territoryCode
  }
`;

/* Line items are fetched 50-deep so the list page can show an accurate item
   count — LineItemConnection has no totalCount, so counting means fetching. */
const LINE_ITEM_FRAGMENT = /* GraphQL */ `
  fragment LineItemFields on LineItem {
    id
    name
    quantity
    productId
    variantId
    image {
      url
      altText
    }
    price {
      ...MoneyFields
    }
    variantOptions {
      name
      value
    }
  }
`;

const ORDER_CARD_FRAGMENT = /* GraphQL */ `
  fragment OrderCardFields on Order {
    id
    name
    processedAt
    cancelledAt
    financialStatus
    fulfillmentStatus
    totalPrice {
      ...MoneyFields
    }
    lineItems(first: 50) {
      nodes {
        ...LineItemFields
      }
    }
    fulfillments(first: 10) {
      nodes {
        createdAt
        updatedAt
        latestShipmentStatus
        trackingInformation {
          company
          number
          url
        }
      }
    }
  }
`;

export const ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($cursor: String) {
    customer {
      orders(first: 25, after: $cursor, sortKey: PROCESSED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...OrderCardFields
        }
      }
    }
  }
  ${ORDER_CARD_FRAGMENT}
  ${LINE_ITEM_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

export const ORDER_QUERY = /* GraphQL */ `
  query CustomerOrder($id: ID!) {
    order(id: $id) {
      ...OrderCardFields
      statusPageUrl
      subtotal {
        ...MoneyFields
      }
      totalTax {
        ...MoneyFields
      }
      totalShipping {
        ...MoneyFields
      }
      shippingAddress {
        ...AddressFields
      }
      paymentInformation {
        paymentStatus
      }
    }
  }
  ${ORDER_CARD_FRAGMENT}
  ${LINE_ITEM_FRAGMENT}
  ${ADDRESS_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

/* `defaultAddress` is read alongside the list because CustomerAddress carries
   no "is default" flag of its own — it's identified by matching ids. */
export const ADDRESSES_QUERY = /* GraphQL */ `
  query CustomerAddresses {
    customer {
      defaultAddress {
        id
      }
      addresses(first: 50) {
        nodes {
          ...AddressFields
        }
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const ADDRESS_CREATE = /* GraphQL */ `
  mutation CustomerAddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
      customerAddress {
        ...AddressFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const ADDRESS_UPDATE = /* GraphQL */ `
  mutation CustomerAddressUpdate($addressId: ID!, $address: CustomerAddressInput!) {
    customerAddressUpdate(addressId: $addressId, address: $address) {
      customerAddress {
        ...AddressFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const ADDRESS_DELETE = /* GraphQL */ `
  mutation CustomerAddressDelete($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) {
      deletedAddressId
      userErrors {
        field
        message
      }
    }
  }
`;

export const DEFAULT_ADDRESS_UPDATE = /* GraphQL */ `
  mutation CustomerDefaultAddressUpdate($addressId: ID!) {
    customerDefaultAddressUpdate(addressId: $addressId) {
      customerAddress {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
