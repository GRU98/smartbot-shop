import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm">
      <Link to="/" className="flex items-center text-neutral-500 hover:text-white transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-neutral-700" />
          {item.href && idx < items.length - 1 ? (
            <Link to={item.href} className="text-neutral-500 hover:text-white transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-neutral-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
