import { motion } from "framer-motion";
import { Quote } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  delay?: number;
}

export function TestimonialCard({
  quote,
  author,
  role,
  delay = 0,
}: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay }}
      className="bg-white dark:bg-card rounded-md p-6 border border-border"
      data-testid={`card-testimonial-${author.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Quote className="w-8 h-8 text-brand-500/20 mb-4" />
      <p className="text-foreground mb-4 italic">&ldquo;{quote}&rdquo;</p>
      <div className="border-t border-border pt-4">
        <p className="font-semibold text-foreground">{author}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </motion.div>
  );
}
