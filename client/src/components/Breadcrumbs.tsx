import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.href ? (
            <Link href={item.href}>
              <a className="hover:text-foreground transition-colors" data-testid={`link-breadcrumb-${index}`}>
                {item.label}
              </a>
            </Link>
          ) : (
            <span className="text-foreground font-medium" data-testid={`text-breadcrumb-${index}`}>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
