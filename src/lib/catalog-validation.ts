import type { CatalogRecords, AffiliateOffer, Merchant, Review } from "./catalog-types";

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

export function validateCatalog(
  records: CatalogRecords,
  today = new Date().toISOString().slice(0, 10)
): string[] {
  const errors: string[] = [];
  const unique = (values: string[], label: string) => {
    const seen = new Set<string>();
    for (const value of values) {
      if (!filled(value)) errors.push(`${label} is empty`);
      else if (seen.has(value)) errors.push(`duplicate ${label}: ${value}`);
      seen.add(value);
    }
  };
  unique(
    records.categories.map((item) => item.id),
    "category id"
  );
  unique(
    records.categories.map((item) => item.slug),
    "category slug"
  );
  unique(
    records.products.map((item) => item.id),
    "product id"
  );
  unique(
    records.products.map((item) => item.slug),
    "product slug"
  );
  unique(
    records.merchants.map((item) => item.id),
    "merchant id"
  );
  unique(
    records.merchants.flatMap((item) =>
      item.approvedDestinations.map((destination) => destination.id)
    ),
    "approved destination id"
  );
  unique(
    records.merchants.flatMap((item) =>
      item.approvedDestinations.map((destination) => destination.url)
    ),
    "approved destination URL"
  );
  unique(
    records.offers.map((item) => item.id),
    "offer id"
  );
  unique(
    records.reviews.map((item) => item.productId),
    "review product id"
  );

  const categoryIds = new Set(records.categories.map((item) => item.id));
  const productIds = new Set(records.products.map((item) => item.id));
  const merchants = new Map(records.merchants.map((item) => [item.id, item]));
  const reviews = new Map(records.reviews.map((item) => [item.productId, item]));

  for (const category of records.categories) {
    if (!slugPattern.test(category.slug)) errors.push(`invalid category slug: ${category.slug}`);
    if (!["draft", "published"].includes(category.state))
      errors.push(`invalid category state: ${category.id}`);
    if (
      category.state === "published" &&
      ![category.name, category.description, category.audience].every(filled)
    )
      errors.push(`incomplete published category: ${category.id}`);
  }
  for (const product of records.products) {
    if (!slugPattern.test(product.slug)) errors.push(`invalid product slug: ${product.slug}`);
    if (!["draft", "published"].includes(product.state))
      errors.push(`invalid product state: ${product.id}`);
    if (!categoryIds.has(product.categoryId))
      errors.push(`unknown category for product: ${product.id}`);
    if (product.state === "published") {
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
        records.categories.find((category) => category.id === product.categoryId)?.state !==
        "published"
      )
        errors.push(`unpublished category for product: ${product.id}`);
    }
  }
  for (const review of records.reviews) {
    if (!productIds.has(review.productId))
      errors.push(`unknown product for review: ${review.productId}`);
    if (!["draft", "published"].includes(review.state))
      errors.push(`invalid review state: ${review.productId}`);
    if (review.state === "published" && !isCompleteReview(review, today))
      errors.push(`incomplete review: ${review.productId}`);
  }
  for (const merchant of records.merchants) {
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
  const activeOfferProducts = new Set<string>();
  for (const offer of records.offers) {
    if (!productIds.has(offer.productId)) errors.push(`unknown product for offer: ${offer.id}`);
    const merchant = merchants.get(offer.merchantId);
    if (!merchant) errors.push(`unknown merchant for offer: ${offer.id}`);
    if (
      merchant &&
      !merchant.approvedDestinations.some(
        (destination) => destination.id === offer.approvedDestinationId
      )
    )
      errors.push(`unknown approved destination for offer: ${offer.id}`);
    if (!["inactive", "active"].includes(offer.state))
      errors.push(`invalid offer state: ${offer.id}`);
    if (offer.state === "active") {
      if (activeOfferProducts.has(offer.productId))
        errors.push(`multiple active offers for product: ${offer.productId}`);
      activeOfferProducts.add(offer.productId);
    }
    if (offer.state === "active" && (!merchant || !isRenderSafeOffer(offer, merchant)))
      errors.push(`invalid active offer: ${offer.id}`);
    if (
      offer.state === "active" &&
      records.products.find((product) => product.id === offer.productId)?.state !== "published"
    )
      errors.push(`unpublished product for offer: ${offer.id}`);
  }
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
