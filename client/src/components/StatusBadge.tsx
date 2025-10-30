import { Badge } from "@/components/ui/badge";
import type { EventState, RsvpStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: EventState | RsvpStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<EventState | RsvpStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    draft: { variant: "secondary", label: "Draft" },
    polling: { variant: "default", label: "Polling" },
    rsvp: { variant: "default", label: "RSVP Open" },
    final: { variant: "outline", label: "Finalized" },
    closed: { variant: "secondary", label: "Closed" },
    joined: { variant: "default", label: "Joined" },
    waitlisted: { variant: "secondary", label: "Waitlisted" },
    withdrawn: { variant: "destructive", label: "Withdrawn" },
  };

  const { variant, label } = config[status];

  return (
    <Badge variant={variant} className="text-xs font-medium uppercase tracking-wide">
      {label}
    </Badge>
  );
}
