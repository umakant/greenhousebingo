"use client";

import { useRef, useState } from "react";
import { ImagePlus, Quote, Send, X } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/waterice/site-header";
import { cn } from "@/lib/utils";

type Testimonial = {
  id: string;
  author_name: string;
  message: string;
  image_url: string | null;
  color: string;
  created_at: string;
  location: string | null;
};

const COLORS = [
  { key: "amber", swatch: "bg-amber-200", card: "bg-amber-50 border-amber-200" },
  { key: "rose", swatch: "bg-rose-200", card: "bg-rose-50 border-rose-200" },
  { key: "sky", swatch: "bg-sky-200", card: "bg-sky-50 border-sky-200" },
  { key: "mint", swatch: "bg-emerald-200", card: "bg-emerald-50 border-emerald-200" },
  { key: "lilac", swatch: "bg-violet-200", card: "bg-violet-50 border-violet-200" },
  { key: "cream", swatch: "bg-stone-100", card: "bg-stone-50 border-stone-200" },
];

const cardClass = (color: string) =>
  COLORS.find((c) => c.key === color)?.card ?? COLORS[0].card;

const SEED: Testimonial[] = [
  {
    id: "seed-1",
    author_name: "Marcus T.",
    message:
      "Started with one cooler at a block party. Six months later I'm booking weekend events back to back. Water Ice Express gave me the playbook and the product.",
    image_url: null,
    color: "amber",
    created_at: "2026-04-12T15:00:00.000Z",
    location: "Philadelphia, PA",
  },
  {
    id: "seed-2",
    author_name: "@frozenfaith",
    message:
      "The Cherry and Mango are unreal. My customers keep coming back and the wholesale pricing makes the margins actually work.",
    image_url: null,
    color: "rose",
    created_at: "2026-04-28T18:30:00.000Z",
    location: "Atlanta, GA",
  },
  {
    id: "seed-3",
    author_name: "Dana R.",
    message:
      "The consulting calls changed how I price everything. This is more than water ice — it's a real business community.",
    image_url: null,
    color: "sky",
    created_at: "2026-05-09T12:15:00.000Z",
    location: "Jacksonville, FL",
  },
  {
    id: "seed-4",
    author_name: "The Ortiz Family",
    message:
      "We turned a summer side hustle into a family business. The kids scoop, I drive, and we all win. Thank you WIE!",
    image_url: null,
    color: "mint",
    created_at: "2026-05-18T20:45:00.000Z",
    location: "Orlando, FL",
  },
];

export function TestimonialsClient() {
  const [items, setItems] = useState<Testimonial[]>(SEED);
  const [open, setOpen] = useState(false);

  const addItem = (t: Testimonial) => setItems((prev) => [t, ...prev]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="testimonials" />

      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
            The Community Board
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold mt-4 leading-tight">
            Real Stories. Real Cups. <span className="text-primary">Real People.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Pin your story, drop a photo, or just leave a shout-out. Every post lands on the wall
            for the whole community to see.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-3.5 font-semibold shadow-lg hover:opacity-90 transition-opacity"
          >
            <ImagePlus className="w-5 h-5" /> Pin to the board
          </button>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {items.length === 0 ? (
          <div className="text-center py-24">
            <Quote className="w-12 h-12 mx-auto text-primary/30" />
            <p className="mt-4 text-muted-foreground">
              Be the first to pin a story to the board.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 [column-fill:_balance]">
            {items.map((t, i) => (
              <article
                key={t.id}
                className={cn(
                  "mb-5 break-inside-avoid rounded-2xl border shadow-sm hover:shadow-xl transition-all overflow-hidden",
                  cardClass(t.color),
                  i % 5 === 0 ? "rotate-[-0.6deg]" : i % 5 === 2 ? "rotate-[0.5deg]" : "",
                )}
              >
                {t.image_url && (
                  <img
                    src={t.image_url}
                    alt={`Pinned by ${t.author_name}`}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-5">
                  <Quote className="w-5 h-5 text-foreground/30" />
                  <p className="mt-2 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                    {t.message}
                  </p>
                  <div className="mt-4 pt-3 border-t border-foreground/10 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm truncate">— {t.author_name}</p>
                      {t.location && (
                        <p className="text-[11px] text-foreground/60 mt-0.5 truncate">{t.location}</p>
                      )}
                    </div>
                    <p className="text-[11px] text-foreground/50 shrink-0">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {open && <PinDialog onClose={() => setOpen(false)} onAdd={addItem} />}
    </div>
  );
}

function PinDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: Testimonial) => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("amber");
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) {
      setPreview(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setPreview(URL.createObjectURL(f));
  };

  const submit = () => {
    if (!name.trim() || !message.trim()) {
      toast.error("Add your name and a message");
      return;
    }
    setSubmitting(true);
    onAdd({
      id: crypto.randomUUID(),
      author_name: name.trim().slice(0, 80),
      message: message.trim().slice(0, 1000),
      image_url: preview,
      color,
      location: location.trim() ? location.trim().slice(0, 80) : null,
      created_at: new Date().toISOString(),
    });
    toast.success("Pinned to the board!");
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-display text-xl font-bold">Pin to the board</h2>
          <button
            onClick={onClose}
            className="grid place-items-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="First name or @handle"
              className="mt-1.5 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              City, State
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={80}
              placeholder="Philadelphia, PA"
              className="mt-1.5 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your story or shout-out
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Share what Water Ice Express means to you..."
              className="mt-1.5 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              {message.length}/1000
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Card color
            </label>
            <div className="mt-1.5 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  aria-label={c.key}
                  className={cn(
                    "w-9 h-9 rounded-full border-2 transition-transform",
                    c.swatch,
                    color === c.key ? "border-foreground scale-110" : "border-transparent",
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add a photo (optional)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <div className="mt-1.5 relative rounded-xl overflow-hidden border">
                <img src={preview} alt="Preview" className="w-full max-h-64 object-cover" />
                <button
                  type="button"
                  onClick={() => handleFile(null)}
                  className="absolute top-2 right-2 grid place-items-center w-8 h-8 rounded-full bg-foreground/70 text-background hover:bg-foreground"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 w-full rounded-xl border-2 border-dashed border-border px-4 py-8 grid place-items-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">Click to upload (max 5MB)</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-5 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send className="w-4 h-4" />
            Pin it
          </button>
        </div>
      </div>
    </div>
  );
}
