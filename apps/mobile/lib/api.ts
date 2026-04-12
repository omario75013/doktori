import { Platform } from "react-native";
import { getToken, logout } from "./auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    await logout();
    throw new ApiError(401, "Session expirée");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Erreur ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  requestOtp: (phone: string) =>
    apiFetch<{ success: boolean }>("/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    apiFetch<{ token: string; patient: { id: string; phone: string } }>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),

  // Search
  searchDoctors: (q: string, filters?: { specialty?: string; city?: string }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters?.specialty) params.set("specialty", filters.specialty);
    if (filters?.city) params.set("city", filters.city);
    return apiFetch<any>(`/api/search?${params.toString()}`);
  },

  // Doctors — FIXED: was /api/doctors/${slug}, correct is /api/doctors/by-slug/${slug}
  getDoctor: (slug: string) => apiFetch<any>(`/api/doctors/by-slug/${slug}`),

  getDoctorAvailability: (slug: string, date: string) =>
    apiFetch<any>(`/api/doctors/by-slug/${slug}/availability?date=${date}`),

  getDoctorReviews: (doctorId: string) =>
    apiFetch<any>(`/api/reviews?doctorId=${doctorId}`),

  // Appointments
  getSlots: (doctorId: string, date: string) =>
    apiFetch<Array<{ startTime: string; endTime: string; available: boolean }>>(
      `/api/appointments?doctorId=${doctorId}&date=${date}`
    ),

  bookAppointment: (data: {
    doctorId: string;
    patientName: string;
    patientPhone: string;
    date: string;
    startTime: string;
    reason?: string;
    appointmentTypeId?: string;
    practiceId?: string;
    beneficiaryRelation?: string;
    beneficiaryName?: string;
    beneficiaryDateOfBirth?: string;
    questionnaire?: Record<string, string>;
  }) => apiFetch<{ id: string; paymentUrl?: string }>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  getAppointment: (id: string) =>
    apiFetch<{ id: string; status: string }>(`/api/appointments/${id}`),

  getAppointmentTypes: (doctorId: string) =>
    apiFetch<Array<{ id: string; name: string; durationMinutes: number; fee: number | null; color: string }>>(
      `/api/appointment-types?doctorId=${doctorId}`
    ),

  getAppointmentTypeQuestions: (typeId: string) =>
    apiFetch<Array<{ id: string; label: string; kind: string; choices: string[] | null; required: boolean; displayOrder: number }>>(
      `/api/appointment-types/questions-public?typeId=${typeId}`
    ),

  getDoctorPractices: (doctorId: string) =>
    apiFetch<Array<{ id: string; name: string; address: string; city: string; phone: string | null; isPrimary: boolean }>>(
      `/api/doctors/${doctorId}/practices`
    ),

  getMyAppointments: () => apiFetch<any>("/api/appointments/patient"),

  cancelAppointment: (id: string) =>
    apiFetch<any>(`/api/appointments/${id}/cancel`, { method: "POST" }),

  // SOS
  sosRequest: (data: {
    patientName: string;
    patientPhone: string;
    latitude: number;
    longitude: number;
    symptomCategory?: string;
    description?: string;
  }) => apiFetch<{ sessionId: string }>("/api/sos/request", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  sosSession: (sessionId: string) =>
    apiFetch<{
      id: string;
      status: string;
      doctor_name: string | null;
      doctor_phone: string | null;
      doctor_address: string | null;
      requested_at: string;
      accepted_at: string | null;
      expires_at: string;
    }>(`/api/sos/session/${sessionId}`),

  // Push
  registerPushToken: (token: string) =>
    apiFetch<any>("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    }),

  // Messaging
  getConversations: () =>
    apiFetch<any[]>("/api/messages/conversations"),

  createConversation: (doctorId: string) =>
    apiFetch<any>("/api/messages/conversations", {
      method: "POST",
      body: JSON.stringify({ doctorId }),
    }),

  getMessages: (conversationId: string) =>
    apiFetch<any[]>(`/api/messages/${conversationId}`),

  sendMessage: (conversationId: string, content: string) =>
    apiFetch<{ message: any }>(`/api/messages/${conversationId}`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  getUnreadCount: () =>
    apiFetch<{ count: number }>("/api/messages/unread"),
};
