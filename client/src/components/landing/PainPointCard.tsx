import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface PainPointCardProps {
  title: string;
  description: string;
  delay?: number;
}

export function PainPointCard({
  title,
  description,
  delay = 0,
}: PainPointCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay }}
      className="bg-white dark:bg-card rounded-md p-6 border-l-4 border-l-destructive border-r border-t border-b border-border"
      data-testid={`card-pain-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-destructive/10 rounded-md flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
