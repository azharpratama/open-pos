import { Coffee, CookingPot, CupSoda, Cookie } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/lib/menu";

const CATEGORY_ICON: Record<ProductCategory, typeof Coffee> = {
  Kopi: Coffee,
  "Non-Kopi": CupSoda,
  Makanan: CookingPot,
  Snack: Cookie,
};

const CATEGORY_GRADIENT: Record<ProductCategory, string> = {
  Kopi: "from-primary to-primary/80",
  "Non-Kopi": "from-secondary to-primary/60",
  Makanan: "from-primary/90 to-secondary",
  Snack: "from-secondary/90 to-primary",
};

export function ProductThumb({
  category,
  imageUrl,
  alt,
  className,
}: {
  category: ProductCategory;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category];
  // The wrapper (sized by `className`, e.g. aspect-[4/3] w-full or size-12) is
  // the single source of the box shape. An owner photo is absolutely positioned
  // to fill it, so its natural dimensions can never push the card's layout —
  // the photo box ends up identical to the icon-tile box.
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg",
        !imageUrl && "bg-gradient-to-br text-primary-foreground",
        !imageUrl && CATEGORY_GRADIENT[category],
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt ?? ""}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <Icon className="size-8 opacity-90" strokeWidth={1.5} />
      )}
    </div>
  );
}
