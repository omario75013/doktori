"use client";

import { motion, type Variants } from "framer-motion";
import { ShieldCheck, Clock, UserCheck, Star } from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", delay: i * 0.07 },
  }),
};

/** Wraps any section with a staggered fade-up animation */
export function AnimatedSection({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** CTA button with hover scale animation */
export function AnimatedCTAButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Trust signals section */
export function TrustSignals({
  averageRating,
  reviewCount,
  acceptsNewPatients = true,
}: {
  averageRating: number;
  reviewCount: number;
  acceptsNewPatients?: boolean;
}) {
  const badges = [
    {
      icon: <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={2} />,
      label: "Profil vérifié",
      sub: "par Doktori",
      bg: "bg-secondary",
      border: "border-[#CCFBF1]",
      text: "text-foreground",
    },
    {
      icon: <Clock className="h-5 w-5 text-amber-500" strokeWidth={2} />,
      label: "Répond en < 24h",
      sub: "en moyenne",
      bg: "bg-amber-50",
      border: "border-amber-100",
      text: "text-amber-900",
    },
    ...(acceptsNewPatients
      ? [
          {
            icon: <UserCheck className="h-5 w-5 text-emerald-600" strokeWidth={2} />,
            label: "Nouveaux patients",
            sub: "acceptés",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            text: "text-emerald-900",
          },
        ]
      : []),
    ...(reviewCount > 0
      ? [
          {
            icon: <Star className="h-5 w-5 fill-doktori-amber text-doktori-amber" strokeWidth={0} />,
            label: `${averageRating.toFixed(1)} / 5`,
            sub: `${reviewCount} avis vérifiés`,
            bg: "bg-[#FFFBEB]",
            border: "border-[#FEF3C7]",
            text: "text-[#92400E]",
          },
        ]
      : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {badges.map((b, i) => (
        <motion.div
          key={b.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.06, duration: 0.3 }}
          className={`flex flex-col items-center gap-1.5 rounded-2xl border ${b.border} ${b.bg} px-3 py-4 text-center`}
        >
          {b.icon}
          <div className={`text-sm font-bold leading-tight ${b.text}`}>{b.label}</div>
          <div className="text-[11px] font-medium text-gray-500">{b.sub}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
