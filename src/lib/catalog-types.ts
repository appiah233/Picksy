export type PublicationState = "draft" | "published";
export type OfferState = "inactive" | "active";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  audience: string;
  state: PublicationState;
}

export interface Product {
  id: string;
  slug: string;
  categoryId: string;
  name: string;
  officialSource: string;
  summary: string;
  intendedUser: string;
  intendedWorkflow: string;
  editorialImage?: { url: string; alt: string };
  state: PublicationState;
}

export interface Review {
  productId: string;
  author: string;
  evaluatedOn: string;
  publishedOn: string;
  reviewedOn: string;
  methodology: string;
  sources: string[];
  strengths: string[];
  limitations: string[];
  suitableFor: string;
  notSuitableFor: string;
  conclusion: string;
  state: PublicationState;
}

export interface Merchant {
  id: string;
  name: string;
  approvedHosts: string[];
  approvedDestinations: ApprovedDestination[];
}

export interface ApprovedDestination {
  id: string;
  url: string;
  authorizationReference: string;
}

export interface AffiliateOffer {
  id: string;
  productId: string;
  merchantId: string;
  approvedDestinationId: string;
  label: string;
  disclosure: string;
  state: OfferState;
}

export interface CatalogRecords {
  categories: Category[];
  products: Product[];
  reviews: Review[];
  merchants: Merchant[];
  offers: AffiliateOffer[];
}
