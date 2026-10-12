"use client";

import Image from "next/image";
import { useState } from "react";
import {
  formatServiceMeta,
  serviceImageFor,
  serviceIndex,
  useServices,
} from "@/lib/api";
import styles from "./Services.module.css";

export function Services() {
  const { data: services, loading, error, retry } = useServices();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const current =
    services && services.length > 0
      ? services[Math.min(active, services.length - 1)]
      : null;

  return (
    <section id="services" className={styles.section} aria-labelledby="services-title">
      <div>
        <h2 id="services-title" className={styles.label}>
          Services
        </h2>

        {loading && (
          <ul className={styles.list} aria-label="Loading services">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} aria-hidden="true">
                <div className={`${styles.row} ${styles.skelRow}`}>
                  <span className={styles.skelBar} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && error && (
          <div className={styles.state} role="alert">
            <p>{error}</p>
            <button type="button" className={styles.retry} onClick={retry}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && services?.length === 0 && (
          <div className={styles.state}>
            <p>No services yet. Please check back soon.</p>
          </div>
        )}

        {!loading && !error && services && services.length > 0 && (
          <ul className={styles.list}>
            {services.map((service, index) => {
              const isActive = index === active;
              const isOpen = open === index;
              return (
                <li key={service.id} className={isActive ? styles.active : undefined}>
                  <button
                    type="button"
                    className={styles.row}
                    aria-expanded={isOpen}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") setActive(index);
                    }}
                    onFocus={() => setActive(index)}
                    onClick={() => {
                      setActive(index);
                      setOpen((value) => (value === index ? null : index));
                    }}
                  >
                    <span className={styles.index}>{serviceIndex(index)}</span>
                    <span className={styles.name}>{service.name}</span>
                  </button>
                  {isOpen ? (
                    <div className={styles.panel}>
                      <div className={styles.panelMedia}>
                        <Image src={serviceImageFor(service.name)} alt="" fill sizes="100vw" />
                      </div>
                      <p>{service.description}</p>
                      <p className={styles.meta}>{formatServiceMeta(service)}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {current && (
        <aside className={styles.aside} aria-hidden="true">
          <div className={styles.stage}>
            {services!.map((service, index) => (
              <Image
                key={service.id}
                src={serviceImageFor(service.name)}
                alt=""
                fill
                sizes="40vw"
                className={index === active ? styles.shown : styles.hidden}
              />
            ))}
          </div>
          <p className={styles.asideCopy}>{current.description}</p>
          <p className={styles.meta}>{formatServiceMeta(current)}</p>
        </aside>
      )}
    </section>
  );
}
