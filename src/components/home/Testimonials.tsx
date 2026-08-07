export default function Testimonials() {
  const testimonials = [
    {
      name: "Priya Sharma",
      location: "Delhi",
      review:
        "The consultation gave me clarity regarding my career and future decisions. Everything was explained with patience and confidence.",
    },
    {
      name: "Rahul Verma",
      location: "Lucknow",
      review:
        "Very genuine guidance. The predictions were practical and the remedies were simple to follow. Highly recommended.",
    },
    {
      name: "Neha Gupta",
      location: "Jaipur",
      review:
        "The numerology consultation helped me understand myself better. It was a wonderful experience from start to finish.",
    },
  ];

  return (
    <section className="section">
      <div className="site-container">

        <p className="eyebrow">
          TESTIMONIALS
        </p>

        <h2 className="section-heading">
          What Our Clients Say
        </h2>

        <div className="testimonial-grid">

          {testimonials.map((item) => (

            <div
              key={item.name}
              className="testimonial-card"
            >

              <div className="testimonial-rating">
                ★★★★★
              </div>

              <p className="testimonial-review">
                "{item.review}"
              </p>

              <h3>{item.name}</h3>

              <span>{item.location}</span>

            </div>

          ))}

        </div>

      </div>
    </section>
  );
}