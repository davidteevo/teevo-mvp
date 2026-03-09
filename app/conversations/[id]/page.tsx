import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ConversationDetail } from "../ConversationDetail";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/conversations");
  }

  const { id } = await params;
  if (!id) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ConversationDetail conversationId={id} />
    </div>
  );
}
