import { Barbers } from "@/components/Barbers";
import { Booking } from "@/components/Booking";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { Proof } from "@/components/Proof";
import { Services } from "@/components/Services";
import { Signature } from "@/components/Signature";
import { SiteFooter } from "@/components/SiteFooter";
import { Space } from "@/components/Space";
import { Statement } from "@/components/Statement";
import { Tashkent } from "@/components/Tashkent";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Statement />
        <Services />
        <Barbers />
        <Tashkent />
        <Space />
        <Signature />
        <Proof />
        <Booking />
      </main>
      <SiteFooter />
    </>
  );
}
