import type {
  CatalogRecords,
  AffiliateOffer,
  Category,
  Merchant,
  Product,
  Review,
} from "./catalog-types";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const filled = (value: string) => value.trim().length > 0;
const validDate = (value: string) =>
  datePattern.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const validHttpsUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !!url.hostname &&
      !url.username &&
      !url.password &&
      !/\s/.test(value)
    );
  } catch {
    return false;
  }
};
const validHost = (host: string) =>
  host.length <= 253 &&
  host === host.toLowerCase() &&
  host.split(".").length >= 2 &&
  host
    .split(".")
    .every((label) => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));

export function isCompleteReview(
  review: Review | undefined,
  today = new Date().toISOString().slice(0, 10)
): boolean {
  if (!review) return false;
  const dates = [review.evaluatedOn, review.publishedOn, review.reviewedOn];
  return (
    [
      review.productId,
      review.author,
      review.methodology,
      review.suitableFor,
      review.notSuitableFor,
      review.conclusion,
    ].every(filled) &&
    dates.every(validDate) &&
    review.evaluatedOn <= review.publishedOn &&
    review.publishedOn <= review.reviewedOn &&
    review.reviewedOn <= today &&
    review.sources.length > 0 &&
    review.sources.every(validHttpsUrl) &&
    review.strengths.length > 0 &&
    review.strengths.every(filled) &&
    review.limitations.length > 0 &&
    review.limitations.every(filled)
  );
}

export function isApprovedDestination(destination: string, merchant: Merchant): boolean {
  try {
    const url = new URL(destination);
    return (
      validHttpsUrl(destination) &&
      !url.username &&
      !url.password &&
      !url.port &&
      merchant.approvedHosts.includes(url.hostname.toLowerCase()) &&
      !url.hash &&
      !/\s/.test(destination) &&
      merchant.approvedDestinations.some(
        (approved) => approved.url === destination && filled(approved.authorizationReference)
      )
    );
  } catch {
    return false;
  }
}

export function isRenderSafeOffer(offer: AffiliateOffer, merchant: Merchant): boolean {
  const approved = merchant.approvedDestinations.find(
    (destination) => destination.id === offer.approvedDestinationId
  );
  return (
    offer.state === "active" &&
    filled(offer.disclosure) &&
    filled(offer.label) &&
    offer.label.toLowerCase().includes(merchant.name.toLowerCase()) &&
    !!approved &&
    filled(approved.authorizationReference) &&
    isApprovedDestination(approved.url, merchant)
  );
}

function checkUnique(values: string[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (!filled(value)) errors.push(`${label} is empty`);
    else if (seen.has(value)) errors.push(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function validateIdentifiers(records: CatalogRecords, errors: string[]): void {
  const { categories, products, merchants, offers, reviews } = records;
  const destinations = merchants.flatMap((merchant) => merchant.approvedDestinations);
  const categoryIds = categories.map((item) => item.id);
  const categorySlugs = categories.map((item) => item.slug);
  const productIds = products.map((item) => item.id);
  const productSlugs = products.map((item) => item.slug);
  const merchantIds = merchants.map((item) => item.id);
  const destinationIds = destinations.map((item) => item.id);
  const destinationUrls = destinations.map((item) => item.url);
  const offerIds = offers.map((item) => item.id);
  const reviewProductIds = reviews.map((item) => item.productId);
  checkUnique(categoryIds, "category id", errors);
  checkUnique(categorySlugs, "category slug", errors);
  checkUnique(productIds, "product id", errors);
  checkUnique(productSlugs, "product slug", errors);
  checkUnique(merchantIds, "merchant id", errors);
  checkUnique(destinationIds, "approved destination id", errors);
  checkUnique(destinationUrls, "approved destination URL", errors);
  checkUnique(offerIds, "offer id", errors);
  checkUnique(reviewProductIds, "review product id", errors);
}

function validateCategory(category: Category, errors: string[]): void {
  if (!slugPattern.test(category.slug)) errors.push(`invalid category slug: ${category.slug}`);
  if (!["draft", "published"].includes(category.state))
    errors.push(`invalid category state: ${category.id}`);
  if (
    category.state === "published" &&
    ![category.name, category.description, category.audience].every(filled)
  )
    errors.push(`incomplete published category: ${category.id}`);
}

function validatePublishedProduct(
  product: Product,
  records: CatalogRecords,
  reviews: Map<string, Review>,
  today: string,
  errors: string[]
): void {
  if (
    ![product.name, product.summary, product.intendedUser, product.intendedWorkflow].every(
      filled
    ) ||
    !validHttpsUrl(product.officialSource)
  )
    errors.push(`incomplete published product: ${product.id}`);
  const review = reviews.get(product.id);
  if (!isCompleteReview(review, today) || review?.state !== "published")
    errors.push(`incomplete review for product: ${product.id}`);
  if (
    records.categories.find((category) => category.id === product.categoryId)?.state !== "published"
  )
    errors.push(`unpublished category for product: ${product.id}`);
}

function validateProduct(
  product: Product,
  records: CatalogRecords,
  reviews: Map<string, Review>,
  today: string,
  errors: string[]
): void {
  if (!slugPattern.test(product.slug)) errors.push(`invalid product slug: ${product.slug}`);
  if (!["draft", "published"].includes(product.state))
    errors.push(`invalid product state: ${product.id}`);
  if (!records.categories.some((category) => category.id === product.categoryId))
    errors.push(`unknown category for product: ${product.id}`);
  if (product.state === "published")
    validatePublishedProduct(product, records, reviews, today, errors);
}

function validateReview(
  review: Review,
  productIds: Set<string>,
  today: string,
  errors: string[]
): void {
  if (!productIds.has(review.productId))
    errors.push(`unknown product for review: ${review.productId}`);
  if (!["draft", "published"].includes(review.state))
    errors.push(`invalid review state: ${review.productId}`);
  if (review.state === "published" && !isCompleteReview(review, today))
    errors.push(`incomplete review: ${review.productId}`);
}

function validateMerchant(merchant: Merchant, errors: string[]): void {
  if (
    !filled(merchant.name) ||
    merchant.approvedHosts.length === 0 ||
    merchant.approvedHosts.some((host) => !validHost(host))
  )
    errors.push(`invalid merchant: ${merchant.id}`);
  for (const destination of merchant.approvedDestinations) {
    if (
      !filled(destination.id) ||
      !filled(destination.authorizationReference) ||
      !isApprovedDestination(destination.url, merchant)
    )
      errors.push(`invalid approved destination: ${destination.id}`);
  }
}

function validateOfferReferences(
  offer: AffiliateOffer,
  productIds: Set<string>,
  merchants: Map<string, Merchant>,
  errors: string[]
): Merchant | undefined {
  if (!productIds.has(offer.productId)) errors.push(`unknown product for offer: ${offer.id}`);
  const merchant = merchants.get(offer.merchantId);
  if (!merchant) errors.push(`unknown merchant for offer: ${offer.id}`);
  if (
    merchant &&
    !merchant.approvedDestinations.some((dest) => dest.id === offer.approvedDestinationId)
  )
    errors.push(`unknown approved destination for offer: ${offer.id}`);
  return merchant;
}

function validateOfferState(
  offer: AffiliateOffer,
  merchant: Merchant | undefined,
  records: CatalogRecords,
  activeProducts: Set<string>,
  errors: string[]
): void {
  if (!["inactive", "active"].includes(offer.state))
    errors.push(`invalid offer state: ${offer.id}`);
  if (offer.state !== "active") return;
  if (activeProducts.has(offer.productId))
    errors.push(`multiple active offers for product: ${offer.productId}`);
  activeProducts.add(offer.productId);
  if (!merchant || !isRenderSafeOffer(offer, merchant))
    errors.push(`invalid active offer: ${offer.id}`);
  if (records.products.find((product) => product.id === offer.productId)?.state !== "published")
    errors.push(`unpublished product for offer: ${offer.id}`);
}

function validateOffers(
  records: CatalogRecords,
  productIds: Set<string>,
  merchants: Map<string, Merchant>,
  errors: string[]
): void {
  const activeProducts = new Set<string>();
  for (const offer of records.offers) {
    const merchant = validateOfferReferences(offer, productIds, merchants, errors);
    validateOfferState(offer, merchant, records, activeProducts, errors);
  }
}

export function validateCatalog(
  records: CatalogRecords,
  today = new Date().toISOString().slice(0, 10)
): string[] {
  const errors: string[] = [];
  validateIdentifiers(records, errors);
  const productIds = new Set(records.products.map((item) => item.id));
  const merchants = new Map(records.merchants.map((item) => [item.id, item]));
  const reviews = new Map(records.reviews.map((item) => [item.productId, item]));
  for (const category of records.categories) validateCategory(category, errors);
  for (const product of records.products) validateProduct(product, records, reviews, today, errors);
  for (const review of records.reviews) validateReview(review, productIds, today, errors);
  for (const merchant of records.merchants) validateMerchant(merchant, errors);
  validateOffers(records, productIds, merchants, errors);
  return errors;
}

export function validateCategoryTaxonomy(
  records: CatalogRecords,
  taxonomy: ReadonlyArray<{ id: string; slug: string }>
): string[] {
  return records.categories
    .filter(
      (category) =>
        category.state === "published" &&
        !taxonomy.some((item) => item.id === category.id && item.slug === category.slug)
    )
    .map(
      (category) => `published category absent from site taxonomy: ${category.id}/${category.slug}`
    );
}
