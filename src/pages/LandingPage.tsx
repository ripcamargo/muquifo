import { useEffect } from 'react';
import { About } from '../components/landing/About';
import { BookingSection } from '../components/landing/BookingSection';
import { Gallery } from '../components/landing/Gallery';
import { Hero } from '../components/landing/Hero';
import { Services } from '../components/landing/Services';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { MobileCta } from '../components/layout/MobileCta';
import { BookingModal } from '../components/booking/BookingModal';
import { BOOKING_HASH } from '../utils/bookingIntent';

export default function LandingPage() {
  // Links diretos como /#galeria: a seção só existe depois que o React renderiza.
  // (#agendar não rola a página: abre a janela de agendamento.)
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || window.location.hash === BOOKING_HASH) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <BookingSection />
        <About />
        <Services />
        <Gallery />
      </main>
      <Footer />
      <MobileCta />
      <BookingModal />
    </>
  );
}
