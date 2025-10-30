import { Progress } from "@/components/ui/progress";

interface CapacityBarProps {
  current: number;
  total: number;
  className?: string;
}

export function CapacityBar({ current, total, className = "" }: CapacityBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const isFull = current >= total;

  return (
    <div className={className}>
      <Progress
        value={percentage}
        className="h-2"
        data-testid="progress-capacity"
      />
      <p className="mt-2 text-sm text-muted-foreground" data-testid="text-capacity-info">
        {current} / {total} spots {isFull ? "filled" : "available"}
      </p>
    </div>
  );
}
