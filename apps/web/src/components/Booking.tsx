import Image from "next/image";
import { Magnetic } from "@/components/fx/Magnetic";
import { shop } from "@/data/content";
import styles from "./Booking.module.css";

export function Booking() {
  return (
    <section id="book" className={styles.section} aria-labelledby="book-title">
      <Image src="/images/book.jpg" alt="" fill sizes="100vw" />
      <div className={styles.scrim} />
      <div className={styles.copy}>
        <h2 id="book-title" className={styles.title}>
          <span>Your next</span>
          <em>signature look</em>
          <span>starts here.</span>
        </h2>
        <p className={styles.hours}>{shop.hours}</p>
        <Magnetic>
          <a className="cta" href="/book">
            Book your chair
          </a>
        </Magnetic>
      </div>
    </section>
  );
}
