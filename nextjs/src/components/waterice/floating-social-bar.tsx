import { Instagram, Facebook, Music2 } from "lucide-react";

export function FloatingSocialBar() {
  return (
    <div className="fixed left-3 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-2 bg-card/95 backdrop-blur border border-border rounded-full px-2 py-3 shadow-xl">
      <a
        href="https://www.instagram.com/waterice_express/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="grid place-items-center w-10 h-10 rounded-full text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <Instagram className="w-5 h-5" />
      </a>
      <a
        href="https://www.facebook.com/share/18MzbBQbT6/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
        className="grid place-items-center w-10 h-10 rounded-full text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <Facebook className="w-5 h-5" />
      </a>
      <a
        href="https://www.tiktok.com/@water.ice.express?_r=1&_t=ZP-939EKwi3jjT"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TikTok"
        className="grid place-items-center w-10 h-10 rounded-full text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <Music2 className="w-5 h-5" />
      </a>

      <div className="w-6 h-px bg-border my-1" />

      <a
        href="#"
        aria-label="Get 20% off"
        className="mt-1 grid place-items-center rounded-full bg-primary text-primary-foreground font-bold tracking-widest text-xs px-3 py-4 hover:opacity-95 transition"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        GET 20% OFF
      </a>
    </div>
  );
}
