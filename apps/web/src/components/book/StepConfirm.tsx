"use client";

import Link from "next/link";
import { formatDurationMin, formatPriceUZS, type BookingResponse } from "@/lib/api";
import styles from "./Step.module.css";

interface Props {
  booking: BookingResponse | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tashkent",
  });
}

export function StepConfirm({ booking }: Props) {
  if (!booking) return null;

  const service = booking.services[0];

  return (
    <div className={styles.step}>
      <div className={styles.confirmHero}>
        <div className={styles.confirmIcon} aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M6 16l7 7 13-13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className={styles.confirmTitle}>You&apos;re booked.</h2>
        <p className={styles.confirmSub}>
          We&apos;ll send you a reminder before your appointment. See you at Orda.
        </p>
      </div>

      <div className={styles.confirmCard}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Service</span>
          <span className={styles.summaryValue}>{service?.name ?? "—"}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Duration</span>
          <span className={styles.summaryValue}>
            {formatDurationMin(booking.totalDurationMin)}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Price</span>
          <span className={styles.summaryValue}>
            {formatPriceUZS(booking.totalPrice)}
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Barber</span>
          <span className={styles.summaryValue}>{booking.barber?.name ?? "—"}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Date</span>
          <span className={styles.summaryValue}>{formatDate(booking.startsAt)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Time</span>
          <span className={styles.summaryValue}>{formatTime(booking.startsAt)}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Client</span>
          <span className={styles.summaryValue}>{booking.client?.name || "—"}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Phone</span>
          <span className={styles.summaryValue}>{booking.client?.phone || "—"}</span>
        </div>
      </div>

      <div className={styles.confirmActions}>
        <Link href={`/booking/${booking.manageToken}`} className="cta">
          Manage booking (Reschedule / Cancel)
        </Link>
        <Link href="/" className={styles.btnBack}>
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
