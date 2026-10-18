import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  ExternalLink,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
    <article className="discovery-product-card">
      <Link href={`/products/${product.slug}`} className="discovery-product-hit">
        <span className={`discovery-product-image discovery-product-image-${index % 4}`}>
          {product.editorialImage ? (
            <Image
              src={product.editorialImage.url}
              alt={product.editorialImage.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 900px) 50vw, 25vw"
              className="discovery-product-photo"
            />
          ) : (
            <span className="discovery-product-initial" aria-hidden="true">
              {product.name.slice(0, 1)}
            </span>
          )}
          <span className="discovery-product-image-label">
            Picksy / {String(index + 1).padStart(2, "0")}
          </span>
        </span>
        <span className="discovery-product-info">
          <span className="discovery-overline">
            {category.name}
            {offer ? ` · ${offer.merchant.name}` : ""}
          </span>
          <span className="discovery-product-title">{product.name}</span>
          <span className="discovery-product-summary">{product.summary}</span>
          <span className="discovery-product-link">
            Read the review <ArrowUpRight aria-hidden="true" size={17} />
          </span>
        </span>
      </Link>
    </article>
  );
}

// Only validated, published catalogue records become product or category links.
export function renderHomePage(catalog: CatalogAccess) {
  assertValidatedCatalog(catalog);
  const categories = catalog
    .getPublishedCategories()
    .filter((category) => catalog.getPublishedProductsForCategory(category.id).length > 0);
  const products = categories.flatMap((category) =>
    catalog.getPublishedProductsForCategory(category.id).map((product) => ({ product, category }))
  );
  const featured = products.slice(0, 4);
  return (
    <div className="discovery-home">
      <section className="discovery-hero" aria-labelledby="home-title">
        <div className="discovery-hero-photo" aria-hidden="true" />
        <div className="picksy-container discovery-hero-inner">
          <span className="discovery-eyebrow">
            <span className="discovery-eyebrow-line" /> A considered way to discover
          </span>
          <h1 id="home-title">
            Find the good
            <br />
            <em>in every choice.</em>
          </h1>
          <p>
            Explore products through thoughtful reviews and clear merchant links. Discover what fits
            your life, then choose where to shop.
          </p>
          <div className="discovery-hero-actions">
            <Link
              href={featured.length ? "#products" : "#our-approach"}
              className="discovery-button discovery-button-primary"
            >
              {featured.length ? "Explore the picks" : "Explore Picksy"}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            {categories.length > 0 && (
              <Link href="#categories" className="discovery-button discovery-button-secondary">
                Browse categories
              </Link>
            )}
          </div>
          <div className="discovery-hero-caption">
            <span>01 / DISCOVER</span>
            <span>Independent product discovery</span>
          </div>
        </div>
      </section>
      <div className="discovery-intro-bar">
        <div className="picksy-container discovery-intro-inner">
          <span>
            <Compass aria-hidden="true" size={20} /> Explore with intention
          </span>
          <span>
            <Search aria-hidden="true" size={20} /> Read the details
          </span>
          <span>
            <ExternalLink aria-hidden="true" size={20} /> Visit the merchant
          </span>
        </div>
      </div>
      <section
        id="products"
        className="discovery-section discovery-products"
        aria-labelledby="featured-heading"
      >
        <div className="picksy-container">
          <div className="discovery-section-head">
            <div>
              <span className="discovery-overline">THE PICKSY EDIT</span>
              <h2 id="featured-heading">Discoveries worth a closer look.</h2>
            </div>
            <p>
              Published reviews from our catalogue. Each pick links to its full context before you
              visit a merchant.
            </p>
          </div>
          {featured.length ? (
            <div className="discovery-product-grid">
              {featured.map(({ product, category }, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  category={category}
                  catalog={catalog}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="discovery-empty">
              <span className="discovery-empty-mark" aria-hidden="true">
                <Sparkles size={33} strokeWidth={1.3} />
              </span>
              <div>
                <span className="discovery-overline">THE COLLECTION IS TAKING SHAPE</span>
                <h3>Good discoveries start with good questions.</h3>
                <p>
                  We are preparing reviewed products for publication. Explore how Picksy approaches
                  every recommendation while the collection grows.
                </p>
              </div>
              <Link href="#our-approach" className="discovery-text-link">
                How Picksy works <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
          )}
        </div>
      </section>
      {categories.length > 0 && (
        <section
          id="categories"
          className="discovery-section discovery-categories"
          aria-labelledby="categories-heading"
        >
          <div className="picksy-container">
            <div className="discovery-section-head">
              <div>
                <span className="discovery-overline">EXPLORE BY INTEREST</span>
                <h2 id="categories-heading">Follow your curiosity.</h2>
              </div>
              <p>Browse categories with published product reviews.</p>
            </div>
            <div className="discovery-category-grid">
              {categories.map((category, index) => (
                <Link
                  href={`/categories/${category.slug}`}
                  className={`discovery-category-tile discovery-category-tile-${index % 3}`}
                  key={category.id}
                >
                  <span className="discovery-category-index">
                    {String(index + 1).padStart(2, "0")} / CATEGORY
                  </span>
                  <span className="discovery-category-bottom">
                    <span>
                      <strong>{category.name}</strong>
                      <small>{category.description}</small>
                    </span>
                    <ArrowUpRight aria-hidden="true" size={23} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="discovery-editorial" aria-labelledby="editorial-heading">
        <div className="picksy-container discovery-editorial-inner">
          <span className="discovery-overline">A LITTLE MORE CONTEXT</span>
          <h2 id="editorial-heading">
            The right find is the one that fits <em>you.</em>
          </h2>
          <p>
            Start with the review, understand the tradeoffs, then visit a merchant if the product is
            right for you.
          </p>
          <Link
            href={featured.length ? "#products" : "#our-approach"}
            className="discovery-button discovery-button-light"
          >
            {featured.length ? "Explore reviews" : "Our approach"}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section>
      <section
        id="our-approach"
        className="discovery-section discovery-approach"
        aria-labelledby="approach-heading"
      >
        <div className="picksy-container discovery-approach-grid">
          <div>
            <span className="discovery-overline">WHY PICKSY</span>
            <h2 id="approach-heading">A clearer path from curious to confident.</h2>
            <p>
              Picksy is an independent discovery platform. We present product context and clearly
              identify merchant links; purchases take place on the merchant&apos;s website.
            </p>
          </div>
          <div className="discovery-approach-list">
            <div>
              <span>01</span>
              <div>
                <h3>Explore considered reviews</h3>
                <p>Understand who a product suits and where it may fall short.</p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>See the source and the merchant</h3>
                <p>Reviews show their sources. Available offers name the external merchant.</p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>Decide on your terms</h3>
                <p>
                  Affiliate links are disclosed. Picksy may earn a commission when you buy through
                  one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="discovery-closing">
        <ShieldCheck aria-hidden="true" size={19} />
        <span>Thoughtful discovery. Clear affiliate relationships. Your choice.</span>
      </div>
    </div>
  );
}
