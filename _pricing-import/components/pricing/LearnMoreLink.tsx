import { ChevronRight } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getLearnMore } from "./learnMoreContent";

type Props = {
  /** Feature/row label used to look up the description. */
  label?: string;
  href?: string;
  text?: string;
};

export function LearnMoreLink({ label, href = "#", text = "Learn more" }: Props) {
  const description = label ? getLearnMore(label) : undefined;

  const trigger = (
    <a
      href={href}
      className="group/lm ml-1.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand opacity-50 transition-all duration-200 hover:bg-brand/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 align-middle"
    >
      {text}
      <ChevronRight
        aria-hidden
        className="h-3 w-3 transition-transform duration-200 group-hover/lm:translate-x-0.5"
      />
    </a>
  );

  if (!description) return trigger;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-80 text-sm leading-relaxed text-muted-foreground"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-brand mb-2">{label}</p>
        <p>{description}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
