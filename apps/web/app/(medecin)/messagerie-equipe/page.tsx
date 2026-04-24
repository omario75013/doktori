import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffMessagerie } from "@/components/staff-messagerie";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") redirect("/connexion");
  return <StaffMessagerie selfType="doctor" selfId={session.user.id} />;
}
