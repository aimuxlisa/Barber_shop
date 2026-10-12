"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { ApiBarber, ApiService, AvailabilitySlot, BookingResponse } from "@/lib/api";
import styles from "./BookFlow.module.css";
import { StepService } from "./StepService";
import { StepBarber } from "./StepBarber";
import { StepDate } from "./StepDate";
import { StepTime } from "./StepTime";
import { StepContact } from "./StepContact";
import { StepConfirm } from "./StepConfirm";

export type Service = ApiService;

export interface AnyBarber {
  id: "any";
  name: string;
  photoUrl: string;
  bio: string;
  experienceYears: number;
}

export type Barber = ApiBarber | AnyBarber;

export interface BookingState {
  service: Service | null;
  barber: Barber | null;
  date: string | null; // ISO date string YYYY-MM-DD
  slot: AvailabilitySlot | null;
  name: string;
  phone: string;
}

const STEPS = ["Service", "Barber", "Date", "Time", "Contact", "Confirm"] as const;
type Step = (typeof STEPS)[number];

const STEP_ORDER: Step[] = [...STEPS];

export function BookFlow() {
  const [step, setStep] = useState<Step>("Service");
  const [booking, setBooking] = useState<BookingState>({
    service: null,
    barber: null,
    date: null,
    slot: null,
    name: "",
    phone: "",
  });
  const [createdBooking, setCreatedBooking] = useState<BookingResponse | null>(null);

  const currentIndex = STEP_ORDER.indexOf(step);

  const goNext = useCallback(() => {
    const next = STEP_ORDER[currentIndex + 1];
    if (next) setStep(next);
  }, [currentIndex]);

  const goBack = useCallback(() => {
    const prev = STEP_ORDER[currentIndex - 1];
    if (prev) setStep(prev);
  }, [currentIndex]);

  const goTo = useCallback((target: Step) => {
    const targetIndex = STEP_ORDER.indexOf(target);
    const currentIdx = STEP_ORDER.indexOf(step);
    if (targetIndex < currentIdx) setStep(target);
  }, [step]);

  function handleSuccess(res: BookingResponse) {
    setCreatedBooking(res);
    setStep("Confirm");
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Orda
        </Link>
        <Link href="/" className={styles.close} aria-label="Close booking">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>
      </header>

      {/* Progress */}
      <div className={styles.progress} role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemax={STEP_ORDER.length}>
        <div className={styles.progressBar} style={{ width: `${((currentIndex + 1) / STEP_ORDER.length) * 100}%` }} />
      </div>

      {/* Step nav */}
      <nav className={styles.stepNav} aria-label="Booking steps">
        {STEP_ORDER.map((s, i) => {
          const done = i < currentIndex;
          const active = s === step;
          return (
            <button
              key={s}
              type="button"
              className={`${styles.stepDot} ${active ? styles.dotActive : ""} ${done ? styles.dotDone : ""}`}
              onClick={() => goTo(s)}
              disabled={!done || (s === "Confirm" && !createdBooking)}
              aria-current={active ? "step" : undefined}
              aria-label={s}
            >
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className={styles.dotNum}>{i + 1}</span>
              )}
              <span className={styles.dotLabel}>{s}</span>
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className={styles.content}>
        {step === "Service" && (
          <StepService
            selected={booking.service}
            onSelect={(service) => {
              setBooking((b) => ({ ...b, service, date: null, slot: null }));
              goNext();
            }}
          />
        )}
        {step === "Barber" && (
          <StepBarber
            selected={booking.barber}
            onSelect={(barber) => {
              setBooking((b) => ({ ...b, barber, date: null, slot: null }));
              goNext();
            }}
            onBack={goBack}
          />
        )}
        {step === "Date" && (
          <StepDate
            service={booking.service}
            barber={booking.barber}
            selected={booking.date}
            onSelect={(date) => {
              setBooking((b) => ({ ...b, date, slot: null }));
              goNext();
            }}
            onBack={goBack}
          />
        )}
        {step === "Time" && (
          <StepTime
            service={booking.service}
            barber={booking.barber}
            date={booking.date}
            selected={booking.slot}
            onSelect={(slot) => {
              setBooking((b) => ({ ...b, slot }));
              goNext();
            }}
            onBack={goBack}
          />
        )}
        {step === "Contact" && (
          <StepContact
            name={booking.name}
            phone={booking.phone}
            onChange={(name, phone) => setBooking((b) => ({ ...b, name, phone }))}
            onSuccess={handleSuccess}
            onBack={goBack}
            booking={booking}
          />
        )}
        {step === "Confirm" && (
          <StepConfirm booking={createdBooking} />
        )}
      </div>
    </div>
  );
}
