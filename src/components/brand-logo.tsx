"use client";

import { useState } from "react";
import Image from "next/image";
import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORE_CONFIG } from "@/config/store";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  src?: string;
}

export function BrandLogo({ className, size = "md", src = STORE_CONFIG.logoUrl }: BrandLogoProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "size-8",
    md: "size-9",
    lg: "size-12",
    xl: "size-16",
  };
  const iconSizes = {
    sm: "size-4",
    md: "size-4.5",
    lg: "size-6",
    xl: "size-8",
  };
  const pixelSizes = {
    sm: 32,
    md: 36,
    lg: 48,
    xl: 64,
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm select-none overflow-hidden",
        sizeClasses[size],
        className
      )}
      title={STORE_CONFIG.name}
    >
      {src && !imgError ? (
        <Image
          src={src}
          alt={STORE_CONFIG.name}
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          className="size-full object-cover rounded-xl"
          onError={() => setImgError(true)}
          priority
        />
      ) : (
        <Coffee className={cn("text-white", iconSizes[size])} />
      )}
    </div>
  );
}
