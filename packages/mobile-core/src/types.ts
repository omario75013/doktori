/**
 * Shared mobile types. Where possible we re-export from @doktori/shared so
 * the web and mobile clients see the same entity shapes. Mobile-specific
 * client-side types go here.
 */

export type AuthRole = "patient" | "doctor" | "secretary";

export type AuthUser =
  | {
      role: "patient";
      id: string;
      name: string;
      phone: string;
      email: string | null;
    }
  | {
      role: "doctor";
      id: string;
      name: string;
      email: string;
      photoUrl: string | null;
    }
  | {
      role: "secretary";
      id: string;
      name: string;
      email: string;
      doctorId: string;
      clinicId: string | null;
    };

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser; token: string }
  | { status: "unauthenticated" };

export type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status:
    | "pending"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "no_show";
  type: string;
  reason: string | null;
  practiceId: string | null;
};

export type CallStatus = "idle" | "ringing" | "connected" | "ended" | "error";

export type CallState = {
  sessionId: string | null;
  status: CallStatus;
  peerId: string | null;
  peerType: "doctor" | "patient" | "secretary" | null;
};
