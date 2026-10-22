import { redirect } from "next/navigation";
import { TEEVO_FIT_RESULTS_PATH } from "@/lib/fit-access";

export const dynamic = "force-dynamic";

export default function AdminMatchResultsPage() {
  redirect(TEEVO_FIT_RESULTS_PATH);
}
