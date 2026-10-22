import { redirect } from "next/navigation";
import { TEEVO_FIT_PATH } from "@/lib/fit-access";

export const dynamic = "force-dynamic";

/** Legacy public path. Access control still runs on `/fit`. */
export default function LegacyMatchPage() {
  redirect(TEEVO_FIT_PATH);
}
