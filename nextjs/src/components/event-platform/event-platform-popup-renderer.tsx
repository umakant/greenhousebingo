"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PopupItem = {
  id: string;
  title: string;
  popupType: string;
  contentHtml: string | null;
  mediaUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  frequency: string;
  displayLocation: string;
};

const STORAGE_PREFIX = "ep_popup_seen_";

function popupLocationFromPath(pathname: string): string {
  if (pathname.includes("/lms/events/") && pathname.split("/").length > 3) return "event_detail";
  if (pathname.startsWith("/lms/events")) return "event_catalog";
  if (pathname.startsWith("/lms/my-events")) return "my_events";
  return "all";
}

export function EventPlatformPopupRenderer() {
  const pathname = usePathname();
  const [popup, setPopup] = React.useState<PopupItem | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!pathname) return;
    if (!pathname.startsWith("/lms/events") && !pathname.startsWith("/lms/my-events")) {
      return;
    }

    const location = popupLocationFromPath(pathname);
    void fetch(`/api/event-platform/public/popups?location=${encodeURIComponent(location)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; items?: PopupItem[] }) => {
        if (!data?.ok || !data.items?.length) return;
        const candidate = data.items[0];
        if (candidate.frequency === "once_per_session") {
          const key = STORAGE_PREFIX + candidate.id;
          if (sessionStorage.getItem(key)) return;
          sessionStorage.setItem(key, "1");
        }
        setPopup(candidate);
        setOpen(true);
      })
      .catch(() => {
        /* ignore */
      });
  }, [pathname]);

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{popup.title}</DialogTitle>
        </DialogHeader>
        {popup.mediaUrl && popup.popupType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={popup.mediaUrl} alt="" className="max-h-48 w-full rounded-md object-cover" />
        ) : null}
        {popup.contentHtml ? (
          <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: popup.contentHtml }} />
        ) : null}
        <DialogFooter className="gap-2 sm:justify-between">
          {popup.buttonText && popup.buttonUrl ? (
            <Button asChild>
              <a href={popup.buttonUrl} target="_blank" rel="noreferrer">
                {popup.buttonText}
              </a>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
