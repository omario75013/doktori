import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role === "doctor") redirect("/dashboard");
  if (session?.user?.role === "admin") redirect("/admin");
  return <>{children}</>;
}
