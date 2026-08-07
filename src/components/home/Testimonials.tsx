import Image from "next/image";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Delhi",
    image: "/images/testimonials/user1.jpg",
    review:
      "The consultation gave me clarity regarding my career and future decisions. Everything was explained with patience and confidence.",
  },
  {
    name: "Rahul Verma",
    location: "Lucknow",
    image: "/images/testimonials/user2.jpg",
    review:
      "Very genuine guidance. The predictions were practical and the remedies were simple to follow. Highly recommended.",
  },
  {
    name: "Neha Gupta",
    location: "Jaipur",
    image: "/images/testimonials/user3.jpg",
    review:
      "The numerology consultation helped me understand myself better. It was a wonderful experience from start to finish.",
  },
];

export default function Testimonials() {
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

              <Image
                src={item.image}
                alt={item.name}
                width={70}
                height={70}
                className="testimonial-image"
              />

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