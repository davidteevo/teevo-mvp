import { isAlreadyProcessedPayload } from "@/lib/admin-action-centre";

export type ActionSubmitResult =
  | { ok: true }
  | { ok: false; alreadyProcessed: true; message: string }
  | { ok: false; alreadyProcessed: false; message: string };

export async function readActionResponse(res: Response): Promise<ActionSubmitResult> {
  const data = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true };
  const message =
    typeof (data as { error?: string }).error === "string"
      ? (data as { error: string }).error
      : "Action failed";
  if (res.status === 409 || isAlreadyProcessedPayload(data)) {
    return { ok: false, alreadyProcessed: true, message: "This item has already been processed." };
  }
  return { ok: false, alreadyProcessed: false, message };
}
