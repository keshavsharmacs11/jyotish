import { siteContent } from "@/data/site";

export default function Trust() {
  const { trust } = siteContent;

  return (
    <section className="section">
      <div className="site-container">

        <p className="eyebrow">
          TRUST
        </p>

        <h2 className="section-heading">
          {trust.title}
        </h2>

        <div className="trust-grid">

          {trust.items.map((item) => (
            <div key={item.title} className="trust-card">

              <h3>{item.title}</h3>

              <p>{item.description}</p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}