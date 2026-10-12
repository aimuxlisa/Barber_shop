import { prisma } from "@barbershop/db";

export interface BookingSettings {
  /** Minutes before start when cancel/reschedule is still allowed. */
  cancelCutoffMin: number;
  /** Grid step for slot starts. */
  slotStepMin: number;
  /** How many days ahead (including today) can be booked. */
  bookingHorizonDays: number;
  /** Minimum minutes between "now" and a new booking start. */
  minNoticeMin: number;
  timezone: string;
}

const DEFAULTS: Record<string, string> = {
  cancel_cutoff_min: "30",
  slot_step_min: "15",
  booking_horizon_days: "30",
  min_notice_min: "30",
  timezone: "Asia/Tashkent",
};

function toPositiveInt(raw: string | undefined, fallback: string): number {
  const parsed = Number(raw ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) return Number(fallback);
  return Math.floor(parsed);
}

export async function loadSettings(): Promise<BookingSettings> {
  const rows = await prisma.setting.findMany();
  const values: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) values[row.key] = row.value;
  return {
    cancelCutoffMin: toPositiveInt(values.cancel_cutoff_min, DEFAULTS.cancel_cutoff_min),
    slotStepMin: toPositiveInt(values.slot_step_min, DEFAULTS.slot_step_min),
    bookingHorizonDays: toPositiveInt(values.booking_horizon_days, DEFAULTS.booking_horizon_days),
    minNoticeMin: toPositiveInt(values.min_notice_min, DEFAULTS.min_notice_min),
    timezone: values.timezone || DEFAULTS.timezone,
  };
}
