"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  cancelBookingRequest,
  fetchAvailability,
  fetchBookingByToken,
  formatDurationMin,
  formatPriceUZS,
  rescheduleBookingRequest,
  type AvailabilitySlot,
  type BookingResponse,
} from "@/lib/api";
import styles from "./ManageBooking.module.css";

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

function dateToYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ManageBookingPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(dateToYmd(new Date()));
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchBookingByToken(token)
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load booking.");
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!isRescheduling || !booking) return;
    setSlotsLoading(true);
    setActionError(null);
    fetchAvailability({
      serviceIds: booking.services.map((s) => s.serviceId),
      barberId: booking.barberId,
      date: selectedDate,
    })
      .then((res) => {
        setAvailableSlots(res.slots);
        setSlotsLoading(false);
      })
      .catch((err) => {
        setActionError(err instanceof Error ? err.message : "Could not load slots.");
        setSlotsLoading(false);
      });
  }, [isRescheduling, booking, selectedDate]);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await cancelBookingRequest(token);
      setBooking(updated);
      setActionMessage("Your booking has been cancelled.");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setActionError(errObj.message || "Failed to cancel booking.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRescheduleSubmit() {
    if (!selectedSlot) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await rescheduleBookingRequest(token, selectedSlot.startsAt);
      setBooking(updated);
      setIsRescheduling(false);
      setSelectedSlot(null);
      setActionMessage("Your booking has been successfully rescheduled!");
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === "SLOT_TAKEN") {
        setActionError("That slot was just booked. Please pick another time.");
      } else {
        setActionError(errObj.message || "Failed to reschedule booking.");
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.centerBox}>
          <span className={styles.spinner} />
          <p className={styles.muted}>Loading booking details…</p>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className={styles.main}>
        <div className={styles.centerBox}>
          <h1 className={styles.title}>Booking not found</h1>
          <p className={styles.muted}>{error || "This booking link is invalid or expired."}</p>
          <Link href="/" className="cta">
            Return to Homepage
          </Link>
        </div>
      </main>
    );
  }

  const service = booking.services[0];
  const isConfirmed = booking.status === "confirmed";

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Orda
        </Link>
      </header>

      <div className={styles.container}>
        <div className={styles.headerBlock}>
          <span className={styles.badge} data-status={booking.status}>
            {booking.status}
          </span>
          <h1 className={styles.title}>Manage Your Booking</h1>
          <p className={styles.muted}>
            Booking Reference: <code className={styles.code}>{booking.manageToken.slice(0, 8)}</code>
          </p>
        </div>

        {actionMessage && (
          <div className={styles.successBanner}>
            <p>{actionMessage}</p>
          </div>
        )}

        {actionError && (
          <div className={styles.errorBanner}>
            <p>{actionError}</p>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.label}>Service</span>
            <span className={styles.value}>{service?.name ?? "—"}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Duration</span>
            <span className={styles.value}>{formatDurationMin(booking.totalDurationMin)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Price</span>
            <span className={styles.value}>{formatPriceUZS(booking.totalPrice)}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.row}>
            <span className={styles.label}>Barber</span>
            <span className={styles.value}>{booking.barber?.name ?? "—"}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Date</span>
            <span className={styles.value}>{formatDate(booking.startsAt)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Time</span>
            <span className={styles.value}>{formatTime(booking.startsAt)}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.row}>
            <span className={styles.label}>Client</span>
            <span className={styles.value}>{booking.client?.name ?? "—"}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Phone</span>
            <span className={styles.value}>{booking.client?.phone ?? "—"}</span>
          </div>
        </div>

        {isConfirmed && !isRescheduling && (
          <div className={styles.actionButtons}>
            <button
              type="button"
              className="cta"
              onClick={() => setIsRescheduling(true)}
              disabled={actionLoading}
            >
              Reschedule appointment
            </button>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={handleCancel}
              disabled={actionLoading}
            >
              Cancel booking
            </button>
          </div>
        )}

        {isConfirmed && isRescheduling && (
          <div className={styles.rescheduleSection}>
            <h2 className={styles.sectionTitle}>Pick a new date & time</h2>
            <div className={styles.fieldGroup}>
              <label htmlFor="reschedule-date" className={styles.fieldLabel}>
                Date
              </label>
              <input
                id="reschedule-date"
                type="date"
                className={styles.dateInput}
                value={selectedDate}
                min={dateToYmd(new Date())}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {slotsLoading && (
              <div className={styles.slotsLoading}>
                <span className={styles.spinner} />
                <span>Checking available slots…</span>
              </div>
            )}

            {!slotsLoading && availableSlots.length === 0 && (
              <p className={styles.muted}>No slots available on this date. Try another date.</p>
            )}

            {!slotsLoading && availableSlots.length > 0 && (
              <div className={styles.slotGrid}>
                {availableSlots.map((slot) => {
                  const isActive = selectedSlot?.startsAt === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      className={`${styles.slotButton} ${isActive ? styles.slotActive : ""}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            )}

            <div className={styles.rescheduleActions}>
              <button
                type="button"
                className={styles.btnBack}
                onClick={() => {
                  setIsRescheduling(false);
                  setSelectedSlot(null);
                }}
                disabled={actionLoading}
              >
                Back
              </button>
              <button
                type="button"
                className="cta"
                disabled={!selectedSlot || actionLoading}
                onClick={handleRescheduleSubmit}
              >
                {actionLoading ? "Updating…" : "Confirm new time"}
              </button>
            </div>
          </div>
        )}

        <div className={styles.footerLink}>
          <Link href="/" className={styles.textLink}>
            ← Back to Orda Barbershop
          </Link>
        </div>
      </div>
    </main>
  );
}
