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
        <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Chargement...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-12">{error}</p>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune conversation</p>
          <p className="text-sm text-gray-400 mt-1">
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
            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/messagerie/${conv.id}`)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-teal-200 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{conv.patientName}</p>
                  <p className="text-sm text-gray-500 truncate">{conv.patientPhone}</p>
                  {conv.lastMessageAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  )}
                </div>
                {conv.status === "archived" && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
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
