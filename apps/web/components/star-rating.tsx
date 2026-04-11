"use client";

import { useState } from "react";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
}

export function StarRating({ value, onChange, size = "md", readOnly = false }: Props) {
  const [hover, setHover] = useState(0);
  const sizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl",
  };
  const display = hover || value;

  return (
    <div className={`inline-flex gap-1 ${sizeClasses[size]} ${readOnly ? "" : "cursor-pointer"}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(star)}
          className={star <= display ? "text-yellow-400" : "text-gray-300"}
        >
          ★
        </span>
      ))}
    </div>
  );
}
