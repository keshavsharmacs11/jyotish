"use client";

import { Service } from "@/types/booking";

type ServiceSelectorProps = {
  services: Service[];
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
};

export default function ServiceSelector({
  services,
  selectedServiceId,
  onSelect,
}: ServiceSelectorProps) {
  return (
    <div className="booking-services">

      {services
        .filter((service) => service.active)
        .map((service) => {

          const isSelected =
            selectedServiceId === service.id;

          return (
            <button
              key={service.id}
              type="button"
              className={`booking-service-card ${
                isSelected
                  ? "booking-service-card-selected"
                  : ""
              }`}
              onClick={() => onSelect(service.id)}
            >

              <div className="booking-service-content">

                <span className="booking-service-category">
                  {service.category}
                </span>

                <h3>{service.name}</h3>

                <p>{service.description}</p>

              </div>

              <span className="booking-service-select">
                {isSelected ? "Selected ✓" : "Select"}
              </span>

            </button>
          );
        })}

    </div>
  );
}