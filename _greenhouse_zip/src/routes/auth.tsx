import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in or sign up — Greenhouse Bingo" },
      { name: "description", content: "Log in or create your Greenhouse Bingo account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [role, setRole] = useState("customer");
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
      <Link to="/" className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Leaf className="h-5 w-5" />
        </span>
        <span className="font-display text-xl font-semibold">Greenhouse Bingo</span>
      </Link>
      <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 shadow-lift">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6 space-y-4">
            <div>
              <Label htmlFor="l-email">Email</Label>
              <Input id="l-email" type="email" required />
            </div>
            <div>
              <Label htmlFor="l-pw">Password</Label>
              <Input id="l-pw" type="password" required />
            </div>
            <Button className="w-full">Log in</Button>
            <p className="text-center text-xs text-muted-foreground">
              Auth is coming soon — this is a preview.
            </p>
          </TabsContent>

          <TabsContent value="signup" className="mt-6 space-y-4">
            <div>
              <Label htmlFor="s-role">Account type</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="s-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="rep">Rep / Company</SelectItem>
                  <SelectItem value="venue">Venue partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" required />
            </div>
            <div>
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" required />
            </div>
            <div>
              <Label htmlFor="s-pw">Password</Label>
              <Input id="s-pw" type="password" required />
            </div>
            <Button className="w-full">Create account</Button>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
