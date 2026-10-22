import { redirect } from "next/navigation";
import { TEEVO_FIT_PATH } from "@/lib/fit-access";

export const dynamic = "force-dynamic";

export default function AdminMatchQuestionnairePage({
  searchParams,
}: {
  searchParams: { fresh?: string };
}) {
  redirect(searchParams.fresh === "1" ? `${TEEVO_FIT_PATH}?fresh=1` : TEEVO_FIT_PATH);
}
