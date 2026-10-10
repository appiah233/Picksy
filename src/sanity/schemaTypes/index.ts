import { type SchemaTypeDefinition } from "sanity";
import { categoryType } from "./categoryType";
import { merchantType } from "./merchantType";
import { productType } from "./productType";
import { reviewType } from "./reviewType";
import { affiliateOfferType } from "./affiliateOfferType";
import { importDraftType } from "./importDraftType";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    categoryType,
    merchantType,
    productType,
    reviewType,
    affiliateOfferType,
    importDraftType,
  ],
};
