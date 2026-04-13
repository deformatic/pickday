import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ResponseAuditAction =
  | "public_response_edit"
  | "admin_assignment_update"
  | "admin_response_delete"
  | "admin_selected_option_delete";

type ResponseAuditActorType = "public_token" | "admin_token";

type WriteResponseAuditLogParams = {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  responseId: number;
  action: ResponseAuditAction;
  actorType: ResponseAuditActorType;
  actorIdentifier: string;
};

export async function writeResponseAuditLog({
  supabase,
  responseId,
  action,
  actorType,
  actorIdentifier,
}: WriteResponseAuditLogParams) {
  const { data, error } = await supabase
    .from("response_audit_logs")
    .insert({
      response_id: responseId,
      action,
      actor_type: actorType,
      actor_identifier: actorIdentifier,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    throw new Error("Failed to write response audit log");
  }

  return data.id;
}
