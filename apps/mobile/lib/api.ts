const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  searchDoctors: (q: string, filters?: { specialty?: string; city?: string }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters?.specialty) params.set("specialty", filters.specialty);
    if (filters?.city) params.set("city", filters.city);
    return apiFetch<any>(`/api/search?${params.toString()}`);
  },

  getDoctor: (slug: string) => apiFetch<any>(`/api/doctors/${slug}`),

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
  }) => apiFetch<any>("/api/appointments", { method: "POST", body: JSON.stringify(data) }),

  sosRequest: (data: {
    patientName: string;
    patientPhone: string;
    latitude: number;
    longitude: number;
    symptomCategory?: string;
    description?: string;
  }) =>
    apiFetch<{ sessionId: string }>("/api/sos/request", {
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
};
