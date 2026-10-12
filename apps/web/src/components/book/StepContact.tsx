"use client";

import { useState } from "react";
import { createBookingRequest, type BookingResponse } from "@/lib/api";
import type { BookingState } from "./BookFlow";
import styles from "./Step.module.css";

interface Props {
  name: string;
  phone: string;
  onChange: (name: string, phone: string) => void;
  onSuccess: (bookingResponse: BookingResponse) => void;
  onBack: () => void;
  booking: BookingState;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function StepContact({ name, phone, onChange, onSuccess, onBack, booking }: Props) {
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: { name?: string; phone?: string } = {};
    if (!name.trim()) e.name = "Please enter your name.";
    if (!phone.trim()) {
      e.phone = "Please enter your phone number.";
    } else if (!/^\+?[\d\s\-()]{7,}$/.test(phone.trim())) {
      e.phone = "Please enter a valid phone number.";
    }
    return e;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    if (!booking.service || !booking.barber || !booking.slot) {
      setSubmitError("Please select service, barber, and time slot first.");
      return;
    }

    setErrors({});
    setSubmitError(null);
    setLoading(true);

    try {
      const res = await createBookingRequest({
        serviceIds: [booking.service.id],
        barberId: booking.barber.id,
        startsAt: booking.slot.startsAt,
        client: {
          name: name.trim(),
          phone: phone.trim(),
        },
      });
      setLoading(false);
      onSuccess(res);
    } catch (err: unknown) {
      setLoading(false);
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === "SLOT_TAKEN") {
        setSubmitError("This time slot was just booked by someone else. Please go back and choose another time.");
      } else {
        setSubmitError(errObj.message || "Could not complete your booking. Please try again.");
      }
    }
  }

  return (
    <div className={styles.step}>
      <div className={styles.stepHead}>
        <p className={styles.stepNum}>Step 5 of 6</p>
        <h2 className={styles.stepTitle}>Your details</h2>
        <p className={styles.stepSub}>We&apos;ll use these to confirm your booking.</p>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Service</span>
          <span className={styles.summaryValue}>{booking.service?.name ?? "—"}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Barber</span>
          <span className={styles.summaryValue}>{booking.barber?.name ?? "—"}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Date</span>
          <span className={styles.summaryValue}>{formatDate(booking.date)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Time</span>
          <span className={styles.summaryValue}>{booking.slot?.time ?? "—"}</span>
        </div>
      </div>

      {submitError && (
        <div className={styles.emptyState} role="alert">
          <p className={styles.fieldError}>{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label htmlFor="contact-name" className={styles.fieldLabel}>
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            value={name}
            onChange={(e) => onChange(e.target.value, phone)}
            placeholder="Ivan"
            autoComplete="given-name"
          />
          {errors.name && <p className={styles.fieldError}>{errors.name}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="contact-phone" className={styles.fieldLabel}>
            Phone
          </label>
          <input
            id="contact-phone"
            type="tel"
            className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
            value={phone}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder="+998 90 000 00 00"
            autoComplete="tel"
          />
          {errors.phone && <p className={styles.fieldError}>{errors.phone}</p>}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnBack} onClick={onBack} disabled={loading}>
            ← Back
          </button>
          <button type="submit" id="contact-submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} aria-label="Loading" />
            ) : (
              "Confirm booking"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
