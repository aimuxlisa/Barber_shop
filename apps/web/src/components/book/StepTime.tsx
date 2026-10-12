"use client";

import { useEffect, useState } from "react";
import { fetchAvailability, type AvailabilitySlot } from "@/lib/api";
import type { Barber, Service } from "./BookFlow";
import styles from "./Step.module.css";

interface Props {
  service: Service | null;
  barber: Barber | null;
  date: string | null;
  selected: AvailabilitySlot | null;
  onSelect: (slot: AvailabilitySlot) => void;
  onBack: () => void;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function StepTime({ service, barber, date, selected, onSelect, onBack }: Props) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!service || !barber || !date) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAvailability({
      serviceIds: [service.id],
      barberId: barber.id,
      date,
    })
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load slots.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [service, barber, date]);

  return (
    <div className={styles.step}>
      <div className={styles.stepHead}>
        <p className={styles.stepNum}>Step 4 of 6</p>
        <h2 className={styles.stepTitle}>Choose a time</h2>
        {date && <p className={styles.stepSub}>{formatDate(date)}</p>}
      </div>

      {loading && (
        <div className={styles.emptyState} role="status" aria-label="Loading available time slots">
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.stepSub}>Calculating available time slots…</p>
        </div>
      )}

      {!loading && error && (
        <div className={styles.emptyState} role="alert">
          <p className={styles.stepSub}>{error}</p>
          <button type="button" className={styles.btnBack} onClick={onBack}>
            ← Choose another date
          </button>
        </div>
      )}

      {!loading && !error && slots.length === 0 && (
        <div className={styles.emptyState}>
          <p>No available slots for this day.</p>
          <button type="button" className={styles.btnBack} onClick={onBack}>
            ← Choose another date
          </button>
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <>
          <div className={styles.timeGrid} role="group" aria-label="Available time slots">
            {slots.map((slot) => {
              const isActive = selected?.startsAt === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  id={`time-${slot.time.replace(":", "-")}`}
                  className={`${styles.timeSlot} ${isActive ? styles.timeSlotActive : ""}`}
                  aria-pressed={isActive}
                  onClick={() => onSelect(slot)}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>

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
