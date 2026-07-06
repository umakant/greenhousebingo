import { redirect } from "next/navigation";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { EventPlatformPlaceholder } from "@/components/event-platform/event-platform-placeholder";

type PlaceholderConfig = {
  permission: string;
  path: string;
  title: string;
  description: string;
  breadcrumbs?: { label: string; url?: string }[];
};

export async function eventPlatformPlaceholderPage(config: PlaceholderConfig) {
  return (
    <EventPlatformPage
      permission={config.permission}
      path={config.path}
      title={config.title}
      breadcrumbs={config.breadcrumbs}
    >
      <EventPlatformPlaceholder title={config.title} description={config.description} />
    </EventPlatformPage>
  );
}

export function eventPlatformRedirectPage(path: string) {
  redirect(path);
}
