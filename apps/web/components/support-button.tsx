"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

const HIDDEN_PREFIXES = ["/sos", "/teleconsult"];

export function SupportButton() {
  const pathname = usePathname();
  const number = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "21620000000";

  if (!number) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const text = encodeURIComponent("Bonjour Doktori, j'ai une question");
  const href = `https://wa.me/${number}?text=${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter le support sur WhatsApp"
      // Positioned ABOVE the Chatbot floating button to avoid visual overlap.
      // Chatbot is bottom-6 (mobile) / sm:bottom-8 (desktop), h-16 = 64px → its
      // top edge is at 88-96px from viewport bottom. WhatsApp at bottom-32 =
      // 128px gives a clear 32-40px gap (incl. shadow-lg/shadow-xl glows).
      className="fixed bottom-32 right-4 md:bottom-32 md:right-6 z-40 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full shadow-lg text-white transition-transform hover:scale-105 active:scale-95"
      style={{ backgroundColor: "#25D366" }}
    >
      <MessageCircle className="h-7 w-7" strokeWidth={2.2} />
      <span className="sr-only">Support WhatsApp</span>
    </a>
  );
}
