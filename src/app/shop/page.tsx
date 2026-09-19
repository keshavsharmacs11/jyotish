import Link from "next/link";

const categories = [
  {
    number: "01",
    symbol: "✦",
    title: "Gemstones & Stones",
    description: "Carefully selected stones associated with traditional Jyotish practices.",
  },
  {
    number: "02",
    symbol: "◇",
    title: "Jyotish Jewellery",
    description: "Elegant spiritual jewellery designed around traditional astrological guidance.",
  },
  {
    number: "03",
    symbol: "◈",
    title: "Rudraksha & Malas",
    description: "Traditional malas and sacred pieces for personal spiritual practice.",
  },
  {
    number: "04",
    symbol: "☾",
    title: "Spiritual Essentials",
    description: "Thoughtfully chosen items to complement your personal journey.",
  },
];

export default function ShopPage() {
  return (
    <main className="shop-coming-soon-page">
      <section className="shop-coming-soon-hero">
        <div className="shop-stars" aria-hidden="true" />
        <div className="shop-orbit shop-orbit-one" aria-hidden="true" />
        <div className="shop-orbit shop-orbit-two" aria-hidden="true" />

        <div className="site-container shop-hero-content">
          <p className="shop-eyebrow">AKSHAANSHH JYOTISH SHOP</p>

          <div className="shop-emblem" aria-hidden="true">
            ✦
          </div>

          <h1>
            Sacred Pieces,
            <span>Coming Soon.</span>
          </h1>

          <p className="shop-hero-description">
            We are preparing a thoughtfully curated collection of gemstones,
            sacred stones, Jyotish jewellery, malas and spiritual essentials.
          </p>

          <div className="shop-coming-badge">
            <span className="shop-coming-dot" aria-hidden="true" />
            SHOP COMING SOON
          </div>

          <p className="shop-note">
            Our collection is being prepared with care. Check back soon to
            explore the upcoming Akshaanshh Jyotish Shop.
          </p>

          <div className="shop-actions">
            <Link href="/services" className="btn btn-outline shop-secondary-action">
              Explore Services
            </Link>

            <Link href="/contact" className="btn btn-primary">
              Contact Us <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="shop-preview-section">
        <div className="site-container">
          <div className="shop-section-intro">
            <p className="eyebrow">WHAT'S COMING</p>
            <h2 className="section-heading">
              A Collection Inspired by Jyotish Tradition
            </h2>
            <p className="section-description">
              The shop will bring together selected spiritual and Jyotish
              related goods in one place.
            </p>
          </div>

          <div className="shop-category-grid">
            {categories.map((category) => (
              <article className="shop-category-card" key={category.number}>
                <div className="shop-category-top">
                  <span className="shop-category-symbol" aria-hidden="true">
                    {category.symbol}
                  </span>
                  <span className="shop-category-number">{category.number}</span>
                </div>

                <h3>{category.title}</h3>
                <p>{category.description}</p>

                <span className="shop-category-status">
                  <span aria-hidden="true">•</span> Coming Soon
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shop-final-cta">
        <div className="site-container">
          <div className="shop-final-card">
            <span className="shop-final-symbol" aria-hidden="true">☼</span>
            <div>
              <p className="shop-final-eyebrow">STAY CONNECTED</p>
              <h2>Something special is on its way.</h2>
              <p>
                Until the shop launches, explore our consultation services or
                get in touch with the Akshaanshh Jyotish team.
              </p>
            </div>
            <Link href="/contact" className="btn btn-primary">
              Get in Touch <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
