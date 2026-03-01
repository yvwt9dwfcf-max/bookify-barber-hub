export const STRIPE_PLANS = {
  basic: {
    price_id: "price_1T6EC0GpauAVelbBBlbRVHDJ",
    product_id: "prod_U4Mvxs9AL0HFqE",
  },
  plus: {
    price_id: "price_1T6ECGGpauAVelbB4j3CBjF4",
    product_id: "prod_U4MwyVH94ZhGxE",
  },
  pro: {
    price_id: "price_1T6ECbGpauAVelbBIeVEcy8U",
    product_id: "prod_U4MwyRcbcn1FgD",
  },
  studio: {
    price_id: "price_1T6EDEGpauAVelbBaL4qfEct",
    product_id: "prod_U4MxBY9zovvmOT",
  },
  rede: {
    price_id: "price_1T6EDTGpauAVelbB4hxyw7y9",
    product_id: "prod_U4Mxoa1DybH2Rm",
  },
} as const;

export type StripePlanId = keyof typeof STRIPE_PLANS;
