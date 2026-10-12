"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAvailabilityDays } from "@/lib/api";
import type { Barber, Service } from "./BookFlow";
import styles from "./Step.module.css";

interface Props {
  service: Service | null;
  barber: Barber | null;
  selected: string | null;
  onSelect: (date: string) => void;
  onBack: () => void;
}

interface DayItem {
  iso: string;
  label: string;
  weekday: string;
  disabled: boolean;
}

export function StepDate({ service, barber, selected, onSelect, onBack }: Props) {
  const [availableDaysMap, setAvailableDaysMap] = useState<Map<string, boolean> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!service || !barber) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAvailabilityDays({
      serviceIds: [service.id],
      barberId: barber.id,
    })
      .then((res) => {
        if (cancelled) return;
        const map = new Map<string, boolean>();
        for (const item of res.days) {
          map.set(item.date, item.hasSlots);
        }
        setAvailableDaysMap(map);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback gracefully if API is offline
        setAvailableDaysMap(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [service, barber]);

  const days: DayItem[] = useMemo(() => {
    const list: DayItem[] = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const label = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      
      let disabled = d.getDay() === 1; // default Monday off
      if (availableDaysMap) {
        disabled = !availableDaysMap.get(iso);
      }
      list.push({ iso, label, weekday, disabled });
    }
    return list;
  }, [availableDaysMap]);

  return (
    <div className={styles.step}>
      <div className={styles.stepHead}>
        <p className={styles.stepNum}>Step 3 of 6</p>
        <h2 className={styles.stepTitle}>Choose a date</h2>
        <p className={styles.stepSub}>Select a date for your appointment.</p>
      </div>

      {loading && (
        <div className={styles.emptyState} role="status" aria-label="Checking calendar availability">
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.stepSub}>Checking available dates…</p>
        </div>
      )}

      {error && (
        <div className={styles.emptyState} role="alert">
          <p className={styles.stepSub}>{error}</p>
        </div>
      )}

      <div className={styles.calendar}>
        {/* Weekday header */}
        <div className={styles.calWeekdays} aria-hidden="true">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d} className={styles.calWeekday}>
              {d}
            </span>
          ))}
        </div>

        <div className={styles.calGrid} role="group" aria-label="Select a date">
          {/* Offset first week so calendar aligns to Mon */}
          {(() => {
            const first = days[0];
            if (!first) return null;
            const firstDate = new Date(first.iso + "T00:00:00");
            const offset = (firstDate.getDay() + 6) % 7;
            const empties = Array.from({ length: offset });
            return empties.map((_, i) => <span key={`e-${i}`} className={styles.calEmpty} />);
          })()}

          {days.map((day) => {
            const isSelected = day.iso === selected;
            const isToday = day.iso === new Date().toISOString().slice(0, 10);
            return (
              <button
                key={day.iso}
                type="button"
                id={`date-${day.iso}`}
                className={`${styles.calDay} ${isSelected ? styles.calDayActive : ""} ${day.disabled ? styles.calDayDisabled : ""} ${isToday ? styles.calDayToday : ""}`}
                disabled={day.disabled}
                aria-pressed={isSelected}
                aria-label={`${day.label}, ${day.weekday}`}
                onClick={() => onSelect(day.iso)}
              >
                <span className={styles.calDayNum}>{new Date(day.iso + "T00:00:00").getDate()}</span>
                <span className={styles.calDayMon}>
                  {new Date(day.iso + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnBack} onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}
