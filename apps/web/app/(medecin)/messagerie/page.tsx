"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  id: string;
  status: string;
  lastMessageAt: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  lastMessagePreview?: string;
  unreadCount?: number;
}

function ConversationSkeleton() {
  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/5" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
      </div>
      <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0" />
    </div>
  );
}

export default function DoctorMessageriePage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctor/conversations")
      .then((r) => {
        if (!r.ok) throw new Error("Erreur de chargement");
        return r.json();
      })
      .then((data) => {
        setConversations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-100 rounded-lg">
          <MessageCircle className="w-6 h-6 text-teal-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messagerie</h1>
      </div>

      {loading ? (
        <div className="space-y-2">
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
        </div>
      ) : error ? (
        <p className="text-red-500 text-center py-12">{error}</p>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune conversation</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Les patients peuvent vous contacter après une consultation
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const initials = conv.patientName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const hasUnread = typeof conv.unreadCount === "number" && conv.unreadCount > 0;
            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/messagerie/${conv.id}`)}
                className="w-full text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center text-white font-semibold">
                    {initials}
                  </div>
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#0891B2] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {conv.unreadCount! > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${hasUnread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                    {conv.patientName}
                  </p>
                  {conv.lastMessagePreview ? (
                    <p className={`text-sm truncate mt-0.5 ${hasUnread ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
                      {conv.lastMessagePreview}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 truncate mt-0.5">{conv.patientPhone}</p>
                  )}
                  {conv.lastMessageAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  )}
                </div>
                {conv.status === "archived" && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
                    Archivée
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
