import { redirect } from "next/navigation";

export default function AgendaRedirect() {
  redirect("/calendrier?tab=agenda");
}
