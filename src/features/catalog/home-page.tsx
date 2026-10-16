import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  PackageSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { assertValidatedCatalog, type CatalogAccess } from "@/lib/catalog-access";
import type { Category, Product } from "@/lib/catalog-types";

function ProductCard({
  product,
  category,
  catalog,
  index,
}: {
  product: Product;
  category: Category;
  catalog: CatalogAccess;
  index: number;
}) {
  const offer = catalog.getActiveOfferForProduct(product.id);
  return (
    <article className="picksy-product-card">
      <div className={`picksy-product-art picksy-product-art-${index % 4}`}>
        <span className="picksy-card-tag">Reviewed pick</span>
        <PackageSearch aria-hidden="true" className="picksy-product-art-icon" strokeWidth={1.2} />
      </div>
      <div className="picksy-product-body">
        <div className="picksy-card-meta">
          <span>{category.name}</span>
          {offer && <span className="picksy-merchant">{offer.merchant.name}</span>}
        </div>
        <h3>{product.name}</h3>
        <p className="picksy-product-summary">{product.summary}</p>
        <div className="picksy-product-bottom">
          <span>{offer ? "Offer available" : "Editorial review"}</span>
          <Link href={`/products/${product.slug}`} className="picksy-card-button">
            View review <ArrowUpRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PreviewCard({ index }: { index: number }) {
  return (
    <article className="picksy-product-card picksy-preview-card">
      <div className={`picksy-product-art picksy-product-art-${index}`}>
        <span className="picksy-card-tag">Coming soon</span>
        <PackageSearch aria-hidden="true" className="picksy-product-art-icon" strokeWidth={1.2} />
        <span className="picksy-preview-number">0{index + 1}</span>
      </div>
      <div className="picksy-product-body">
        <div className="picksy-card-meta">
          <span>Future pick</span>
          <span>Picksy</span>
        </div>
        <h3>New discovery on its way</h3>
        <p className="picksy-product-summary">
          Verified products will appear here after editorial review.
        </p>
        <div className="picksy-product-bottom">
          <span>Awaiting publication</span>
          <span className="picksy-card-button picksy-card-button-disabled">Stay tuned</span>
        </div>
      </div>
    </article>
  );
}

// Only validated, published catalogue records become product links or offers.
export function renderHomePage(catalog: CatalogAccess) {
  assertValidatedCatalog(catalog);
  const publishedCategories = catalog
    .getPublishedCategories()
    .filter((category) => catalog.getPublishedProductsForCategory(category.id).length > 0);
  const featured = publishedCategories
    .flatMap((category) =>
      catalog.getPublishedProductsForCategory(category.id).map((product) => ({ product, category }))
    )
    .slice(0, 4);
  return (
    <div className="picksy-home">
      <section className="picksy-hero" aria-labelledby="home-title">
        <div className="picksy-hero-image" aria-hidden="true" />
        <div className="picksy-container picksy-hero-content">
          <div className="picksy-eyebrow">
            <Sparkles aria-hidden="true" size={13} /> Product discovery platform
          </div>
          <h1 id="home-title">Discover What&apos;s Worth Buying.</h1>
          <p className="picksy-hero-copy">
            Picksy cuts through the noise. We research, compare, and recommend products so you can
            shop with confidence.
          </p>
          <div className="picksy-search" role="search">
            <Search aria-hidden="true" size={19} />
            <label htmlFor="picksy-search" className="sr-only">
              Product search coming soon
            </label>
            <input
              id="picksy-search"
              type="search"
              placeholder="Product search coming soon"
              disabled
            />
            <button type="button" disabled>
              Search
            </button>
          </div>
          <div className="picksy-hero-actions">
            <Link href="#products" className="picksy-button picksy-button-primary">
              Explore Products <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link href="#deals" className="picksy-button picksy-button-quiet">
              <Zap aria-hidden="true" size={17} /> Today&apos;s Deals
            </Link>
          </div>
        </div>
      </section>

      <div className="picksy-trust-strip">
        <div className="picksy-container picksy-trust-grid">
          <div>
            <strong>{featured.length}</strong>
            <span>Featured reviews</span>
          </div>
          <div>
            <strong>Source-led</strong>
            <span>Research standards</span>
          </div>
          <div>
            <strong>Clear</strong>
            <span>Affiliate disclosure</span>
          </div>
          <div>
            <strong>Current</strong>
            <span>Review dates shown</span>
          </div>
        </div>
      </div>

      <section id="products" className="picksy-section picksy-products-section">
        <div className="picksy-container">
          <div className="picksy-section-heading">
            <div>
              <span className="picksy-kicker">
                {featured.length ? "Trending now" : "Coming soon"}
              </span>
              <h2>{featured.length ? "What Everyone's Buying" : "What’s worth discovering"}</h2>
            </div>
            <Link href="#categories" className="picksy-text-link">
              View all <ChevronRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <p className="picksy-section-intro">
            Explore researched products as our affiliate catalog grows.
          </p>
          <div className="picksy-product-grid">
            {featured.map(({ product, category }, index) => (
              <ProductCard
                key={product.id}
                product={product}
                category={category}
                catalog={catalog}
                index={index}
              />
            ))}
            {Array.from({ length: 4 - featured.length }, (_, index) => (
              <PreviewCard key={index} index={featured.length + index} />
            ))}
          </div>
        </div>
      </section>

      <section id="deals" className="picksy-deals-section">
        <div className="picksy-container picksy-deals-panel">
          <div>
            <span className="picksy-kicker">
              <Zap aria-hidden="true" size={15} /> Best deals
            </span>
            <h2>Good finds are worth the wait.</h2>
            <p>
              Merchant offers will appear here when a reviewed product has an approved affiliate
              destination.
            </p>
          </div>
          <Link href="#products" className="picksy-button picksy-button-primary">
            Explore picks <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>

      <section id="categories" className="picksy-section picksy-categories-section">
        <div className="picksy-container">
          <div className="picksy-section-heading">
            <div>
              <span className="picksy-kicker">Explore more</span>
              <h2>Find your next favorite.</h2>
            </div>
          </div>
          <div className="picksy-category-grid">
            {siteConfig.categories.map((category) => {
              const published = publishedCategories.find((item) => item.id === category.id);
              const content = (
                <>
                  <span className="picksy-category-icon">
                    <PackageSearch aria-hidden="true" size={23} />
                  </span>
                  <h3>{published?.name ?? category.name}</h3>
                  <p>{published?.description ?? category.description}</p>
                  <span className="picksy-category-status">
                    {published ? "Explore reviewed products" : "Coverage coming soon"}{" "}
                    {published && <ArrowRight aria-hidden="true" size={16} />}
                  </span>
                </>
              );
              return published ? (
                <Link
                  key={category.id}
                  href={`/categories/${published.slug}`}
                  className="picksy-category-card"
                >
                  {content}
                </Link>
              ) : (
                <article key={category.id} className="picksy-category-card">
                  {content}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="why-trust" className="picksy-section picksy-method-section">
        <div className="picksy-container picksy-method-grid">
          <div>
            <span className="picksy-kicker">The Picksy promise</span>
            <h2>Great picks start with good questions.</h2>
            <p>
              We explain who a product suits, where it falls short, and the sources behind every
              published recommendation.
            </p>
          </div>
          <div className="picksy-method-points">
            <div>
              <Search aria-hidden="true" />
              <span>
                <strong>Research first</strong>
                <small>Published claims are checked against their sources.</small>
              </span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Honest limitations</strong>
                <small>Every review makes tradeoffs easy to see.</small>
              </span>
            </div>
            <div>
              <Check aria-hidden="true" />
              <span>
                <strong>Clear offers</strong>
                <small>Affiliate links are labeled and use approved destinations.</small>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
