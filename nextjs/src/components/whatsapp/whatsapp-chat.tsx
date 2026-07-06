"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import { format } from "date-fns";
import { MessageCircle, MessageSquare, Phone, Plus, Search, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string;
  type: string;
  userId?: string;
  createdAt: string;
  messages: Message[];
}

interface Message {
  id: string;
  contactId: string;
  direction: string;
  message: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export function WhatsAppChat() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newChatType, setNewChatType] = useState<"user" | "custom">("user");
  const [newChatUserId, setNewChatUserId] = useState("__none__");
  const [newChatName, setNewChatName] = useState("");
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [search]);

  useEffect(() => {
    if (selectedContact) fetchMessages(selectedContact.id);
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showNewChat) fetchUsers();
  }, [showNewChat]);

  async function fetchContacts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/contacts?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContacts(data);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(contactId: string) {
    try {
      const res = await fetch(`/api/whatsapp/contacts/${contactId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      toast.error("Failed to load messages");
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users?limit=200");
      if (!res.ok) return;
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch {}
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedContact) return;
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContact.id, message: newMessage }),
      });
      if (!res.ok) throw new Error();
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      fetchContacts();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function deleteContact(id: string) {
    try {
      const res = await fetch(`/api/whatsapp/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selectedContact?.id === id) setSelectedContact(null);
      toast.success("Contact deleted");
    } catch {
      toast.error("Failed to delete contact");
    }
  }

  async function createNewChat() {
    if (!newChatPhone.trim() || !newChatMessage.trim()) {
      toast.error("Phone and message are required");
      return;
    }
    if (newChatType === "user" && newChatUserId === "__none__") {
      toast.error("Please select a user");
      return;
    }

    let name = newChatName;
    let userId: string | undefined;

    if (newChatType === "user") {
      const user = users.find((u) => u.id === newChatUserId);
      if (user) {
        name = user.name || user.email;
        userId = user.id;
      }
    }

    setCreating(true);
    try {
      const contactRes = await fetch("/api/whatsapp/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: newChatPhone, type: newChatType, userId }),
      });
      if (!contactRes.ok) throw new Error();
      const contact = await contactRes.json();

      const msgRes = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id, message: newChatMessage }),
      });
      if (!msgRes.ok) throw new Error();

      toast.success("Chat started successfully");
      setShowNewChat(false);
      resetNewChat();
      await fetchContacts();
      setSelectedContact(contact);
    } catch {
      toast.error("Failed to start chat");
    } finally {
      setCreating(false);
    }
  }

  function resetNewChat() {
    setNewChatType("user");
    setNewChatUserId("__none__");
    setNewChatName("");
    setNewChatPhone("");
    setNewChatMessage("");
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const lastMessage = (contact: Contact) => contact.messages?.[0]?.message || "";

  return (
    <div className="flex h-[calc(100vh-180px)] border rounded-xl overflow-hidden bg-background">
      {/* Left Panel — Contacts */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col">
        <div className="p-3 border-b flex items-center gap-2 bg-muted/30">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <span className="font-medium text-sm">WhatsApp Contacts</span>
        </div>

        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          )}

          {!loading && contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Phone className="h-8 w-8 opacity-30" />
              <p className="text-sm">No contacts found</p>
              <p className="text-xs">Try adjusting your search</p>
            </div>
          )}

          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={cn(
                "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b border-border/50 group",
                selectedContact?.id === contact.id && "bg-green-50 dark:bg-green-950/20"
              )}
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{contact.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {lastMessage(contact) || formatPhoneDisplay(contact.phone, contact.phone)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteContact(contact.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Chat */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="p-3 border-b flex items-center gap-3 bg-muted/20">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {getInitials(selectedContact.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedContact.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPhoneDisplay(selectedContact.phone, "—")}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No messages yet. Send the first message!
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.direction === "outbound" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs lg:max-w-md rounded-2xl px-4 py-2 text-sm",
                      msg.direction === "outbound"
                        ? "bg-green-500 text-white rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    )}
                  >
                    <p>{msg.message}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        msg.direction === "outbound" ? "text-green-100" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(msg.createdAt), "hh:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="bg-green-600 hover:bg-green-700"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-16 w-16 opacity-20" />
            <p className="text-lg font-medium">Select a contact</p>
            <p className="text-sm">Choose a contact from the list to start messaging</p>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={(open) => { setShowNewChat(open); if (!open) resetNewChat(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chat with new user</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Type</Label>
              <RadioGroup
                value={newChatType}
                onValueChange={(v) => setNewChatType(v as "user" | "custom")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="user" id="type-user" />
                  <Label htmlFor="type-user" className="cursor-pointer">Choose From Users</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="type-custom" />
                  <Label htmlFor="type-custom" className="cursor-pointer">Custom</Label>
                </div>
              </RadioGroup>
            </div>

            {newChatType === "user" ? (
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Select User</Label>
                <Select value={newChatUserId} onValueChange={setNewChatUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select User</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Name</Label>
                <Input
                  placeholder="Enter Name"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label required className="text-sm font-medium mb-1.5 block">
                Contact
              </Label>
              <Input
                placeholder="919999999999"
                value={newChatPhone}
                onChange={(e) => setNewChatPhone(e.target.value)}
              />
              <p className="text-xs text-destructive mt-1">Please use with country code. (ex: 91)</p>
            </div>

            <div>
              <Label required className="text-sm font-medium mb-1.5 block">
                Message
              </Label>
              <Textarea
                placeholder="Type Message"
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowNewChat(false); resetNewChat(); }}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={createNewChat}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating New Chat Button — rendered outside to trigger dialog */}
      <style>{`.wa-fab { position: absolute; top: 0; right: 0; }`}</style>
      <Button
        className="fixed bottom-8 right-8 h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 shadow-lg z-50"
        size="icon"
        onClick={() => setShowNewChat(true)}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
}
