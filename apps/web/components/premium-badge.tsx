export function PremiumBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-semibold rounded-full ${sizes[size]}`}
    >
      ⭐ Top Médecin
    </span>
  );
}
