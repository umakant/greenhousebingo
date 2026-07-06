import Link from "next/link";
import { MapPin, Phone, Smartphone, Mail } from "lucide-react";

const brandLogo = "/waterice/water-ice-express-logo-icicle.png";

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background mt-20">
      <div className="mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
        {/* Brand */}
        <div>
          <Link href="/" className="inline-flex items-center">
            <img
              src={brandLogo}
              alt="Water Ice Express"
              width={1024}
              height={204}
              className="h-20 w-auto max-w-[280px] object-contain"
            />
          </Link>

          <p className="mt-5 text-sm text-background/70 leading-relaxed max-w-sm">
            Guiding, educating, and supporting motivated entrepreneurs entering and expanding in the water ice industry.
          </p>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-display text-lg font-bold mb-4">Visit Us</h3>
          <ul className="space-y-3 text-sm text-background/80">
            <li className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <span>
                Water Ice Express LLC<br />
                9111 Cross Park Drive, Suite D200<br />
                Knoxville, TN 39721
              </span>
            </li>
          </ul>
        </div>

        {/* Reach */}
        <div>
          <h3 className="font-display text-lg font-bold mb-4">Get in Touch</h3>
          <ul className="space-y-3 text-sm text-background/80">
            <li className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <a href="tel:+18652217859" className="hover:text-primary transition-colors">
                865-221-7859 <span className="text-background/50">(O)</span>
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-primary shrink-0" />
              <a href="tel:+12678317922" className="hover:text-primary transition-colors">
                267-831-7922 <span className="text-background/50">(C)</span>
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <a href="mailto:supports@watericeexpressllc.com" className="hover:text-primary transition-colors break-all">
                supports@watericeexpressllc.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-background/10">
        <div className="mx-auto max-w-7xl px-6 py-10 grid gap-4 text-sm text-background/75 leading-relaxed">
          <h3 className="font-display text-lg font-bold text-background uppercase tracking-wide">
            After Hours Customer Support
          </h3>
          <p>
            Our warehouse and customer service team operates during regular business hours
            10am–6pm, Eastern Standard Time. However, we understand that deliveries may occur
            outside standard operating times. If you experience an issue after hours, please report
            it using our official support method below:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary shrink-0" />
              <span>
                <span className="font-semibold text-background">Support Text Line:</span>{" "}
                <a href="sms:+12678317922" className="hover:text-primary transition-colors">
                  (267) 831-7922
                </a>{" "}
                <span className="text-background/55">(Text Only – After 6pm)</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <span>
                <span className="font-semibold text-background">Email:</span>{" "}
                <a
                  href="mailto:supports@watericeexpressllc.com"
                  className="hover:text-primary transition-colors break-all"
                >
                  supports@watericeexpressllc.com
                </a>
              </span>
            </li>
          </ul>
          <p className="font-semibold text-background">
            NOTE: Please be aware that all sales are NON REFUNDABLE.
          </p>
          <p className="text-background/65">
            Please note: Water Ice Express LLC is a legitimate business and not a scam. We are
            committed to transparency, quality service, and supporting aspiring entrepreneurs.
          </p>
        </div>
      </div>

      <div className="border-t border-background/10">
        <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-background/60 flex flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Water Ice Express LLC. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/about" className="hover:text-primary transition-colors">About</Link>
            <Link href="/services" className="hover:text-primary transition-colors">Services</Link>
            <Link href="/events" className="hover:text-primary transition-colors">Events</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
