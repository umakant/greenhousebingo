import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Greenhouse Bingo" },
      {
        name: "description",
        content:
          "Get in touch with Greenhouse Bingo about becoming a rep, hosting an event, or general support.",
      },
      { property: "og:title", content: "Contact — Greenhouse Bingo" },
      { property: "og:description", content: "Get in touch with Greenhouse Bingo." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [type, setType] = useState("general");
  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="We'd love to hear from you"
        subtitle="Rep inquiries, venue partnerships, or general support — send us a note."
      />
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <form
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="grid gap-4">
            <div>
              <Label htmlFor="c-type">Inquiry type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="c-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General inquiry</SelectItem>
                  <SelectItem value="rep">Become a rep</SelectItem>
                  <SelectItem value="venue">Venue partnership</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" required />
              </div>
              <div>
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" required />
              </div>
            </div>
            <div>
              <Label htmlFor="c-msg">Message</Label>
              <Textarea id="c-msg" rows={5} required />
            </div>
            <Button type="submit">Send</Button>
          </div>
        </form>
      </section>
    </>
  );
}
