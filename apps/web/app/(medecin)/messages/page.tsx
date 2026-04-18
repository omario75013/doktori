import { redirect } from "next/navigation";

/**
 * Legacy /messages route — redirect to /messagerie
 */
export default function MessagesRedirect() {
  redirect("/messagerie");
}
