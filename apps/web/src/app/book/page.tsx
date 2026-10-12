import type { Metadata } from "next";
import { BookFlow } from "@/components/book/BookFlow";

export const metadata: Metadata = {
  title: "Book a visit — Orda Barbershop, Tashkent",
  description:
    "Book your grooming session at Orda. Choose a service, barber, date and time in a few steps.",
};

export default function BookPage() {
  return (
    <main id="main">
      <BookFlow />
    </main>
  );
}
