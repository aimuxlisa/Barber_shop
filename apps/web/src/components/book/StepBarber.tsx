"use client";

import Image from "next/image";
import { useBarbers } from "@/lib/api";
import type { AnyBarber, Barber } from "./BookFlow";
import styles from "./Step.module.css";

const ANY_BARBER: AnyBarber = {
  id: "any",
  name: "Any barber",
  photoUrl: "",
  bio: "First available",
  experienceYears: 0,
};

interface Props {
  selected: Barber | null;
  onSelect: (barber: Barber) => void;
  onBack: () => void;
}

export function StepBarber({ selected, onSelect, onBack }: Props) {
  const { data: barbers, loading, error, retry } = useBarbers();
  const all: Barber[] = barbers ? [ANY_BARBER, ...barbers] : [ANY_BARBER];

  return (
    <div className={styles.step}>
      <div className={styles.stepHead}>
        <p className={styles.stepNum}>Step 2 of 6</p>
        <h2 className={styles.stepTitle}>Choose your barber</h2>
        <p className={styles.stepSub}>Not sure? Pick &ldquo;Any barber&rdquo; and we&rsquo;ll assign the first available.</p>
      </div>

      {loading && (
        <div className={styles.emptyState} role="status" aria-label="Loading barbers">
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.stepSub}>Loading barbers…</p>
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

      {!loading && !error && (
        <>
          <ul className={styles.barberGrid}>
            {all.map((barber) => {
              const isActive = selected?.id === barber.id;
              const isAny = barber.id === "any";
              return (
                <li key={barber.id}>
                  <button
                    type="button"
                    id={`barber-${barber.id}`}
                    className={`${styles.barberCard} ${isActive ? styles.barberActive : ""} ${isAny ? styles.barberAny : ""}`}
                    onClick={() => onSelect(barber)}
                    aria-pressed={isActive}
                  >
                    {isAny ? (
                      <div className={`${styles.barberPhoto} ${styles.barberPhotoAny}`}>
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                          <circle cx="14" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M4 24c0-4.4 4.5-8 10-8s10 3.6 10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    ) : (
                      <div className={styles.barberPhoto}>
                        <Image src={barber.photoUrl} alt="" fill sizes="200px" />
                      </div>
                    )}
                    <div className={styles.barberInfo}>
                      <span className={styles.barberName}>{barber.name}</span>
                      <span className={styles.barberFocus}>{barber.bio}</span>
                      {barber.experienceYears > 0 && (
                        <span className={styles.barberYears}>{barber.experienceYears} years</span>
                      )}
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

          <div className={styles.actions}>
            <button type="button" className={styles.btnBack} onClick={onBack}>
              ← Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
