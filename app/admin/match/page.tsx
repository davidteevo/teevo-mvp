import { redirect } from "next/navigation";
import { TEEVO_FIT_PATH } from "@/lib/fit-access";

export const dynamic = "force-dynamic";

export default function AdminMatchPage() {
  redirect(TEEVO_FIT_PATH);
}
