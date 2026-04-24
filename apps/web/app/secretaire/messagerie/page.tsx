import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffMessagerie } from "@/components/staff-messagerie";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "secretary") redirect("/secretaire-login");
  return <StaffMessagerie selfType="secretary" selfId={session.user.id} />;
}
