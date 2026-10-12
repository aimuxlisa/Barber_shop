"use client";

import Image from "next/image";
import { formatServiceMeta, serviceImageFor, serviceIndex, useServices } from "@/lib/api";
import type { Service } from "./BookFlow";
import styles from "./Step.module.css";

interface Props {
  selected: Service | null;
  onSelect: (service: Service) => void;
}

export function StepService({ selected, onSelect }: Props) {
  const { data: services, loading, error, retry } = useServices();

  return (
    <div className={styles.step}>
      <div className={styles.stepHead}>
        <p className={styles.stepNum}>Step 1 of 6</p>
        <h1 className={styles.stepTitle}>Choose a service</h1>
        <p className={styles.stepSub}>Select one service for your visit.</p>
      </div>

      {loading && (
        <div className={styles.emptyState} role="status" aria-label="Loading services">
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.stepSub}>Loading services…</p>
        </div>
      )}

      {!loading && error && (
        <div className={styles.emptyState} role="alert">
          <p className={styles.stepSub}>{error}</p>
          <button type="button" className={styles.btnSubmit} onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && services?.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.stepSub}>No services available right now. Please call us to book.</p>
        </div>
      )}

      {!loading && !error && services && services.length > 0 && (
        <ul className={styles.serviceList}>
          {services.map((service, position) => {
            const isActive = selected?.id === service.id;
            return (
              <li key={service.id}>
                <button
                  type="button"
                  id={`service-${service.id}`}
                  className={`${styles.serviceCard} ${isActive ? styles.serviceActive : ""}`}
                  onClick={() => onSelect(service)}
                  aria-pressed={isActive}
                >
                  <div className={styles.serviceMedia}>
                    <Image src={serviceImageFor(service.name)} alt="" fill sizes="120px" />
                  </div>
                  <div className={styles.serviceBody}>
                    <span className={styles.serviceIndex}>{serviceIndex(position)}</span>
                    <span className={styles.serviceName}>{service.name}</span>
                    <span className={styles.serviceMeta}>{formatServiceMeta(service)}</span>
                    <p className={styles.serviceDesc}>{service.description}</p>
                  </div>
                  {isActive && (
                    <span className={styles.check} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
