import { z } from "zod";

export const doctorRegistrationSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  phone: z.string().regex(/^(\+216|0)?[2-9]\d{7}$/, "Numéro de téléphone tunisien invalide"),
  specialty: z.string().min(1, "Veuillez sélectionner une spécialité"),
  city: z.string().min(1, "Veuillez sélectionner une ville"),
  address: z.string().min(5, "Adresse trop courte"),
  consultationFee: z.number().min(0).optional(),
  bio: z.string().max(500).optional(),
});

export const doctorProfileUpdateSchema = doctorRegistrationSchema
  .omit({ email: true, password: true })
  .partial();

export type DoctorRegistrationInput = z.infer<typeof doctorRegistrationSchema>;
