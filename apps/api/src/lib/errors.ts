/** Shared API error with an HTTP status and a machine-readable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * True when the database rejected a write because of the
 * `bookings_no_overlap` exclusion constraint (SQLSTATE 23P01).
 * Prisma surfaces exclusion violations as a raw-database error, so we match
 * on the SQLSTATE and the constraint name instead of a Prisma error code.
 */
export function isOverlapDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const text = JSON.stringify({
    code: (error as { code?: unknown }).code,
    message: String((error as { message?: unknown }).message ?? ""),
    meta: (error as { meta?: unknown }).meta,
  });
  return text.includes("23P01") || text.includes("bookings_no_overlap");
}
