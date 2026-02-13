drop policy "conversations_delete_own" on "public"."elicit_conversations";

drop policy "elicit_message_insert_own" on "public"."elicit_messages";

drop policy "conversations_insert_own" on "public"."elicit_conversations";

drop policy "conversations_select_own" on "public"."elicit_conversations";

drop policy "conversations_update_own" on "public"."elicit_conversations";

drop policy "elicit_messages_delete_own" on "public"."elicit_messages";

drop policy "elicit_messages_select_own" on "public"."elicit_messages";

drop policy "elicit_messages_update_own" on "public"."elicit_messages";

alter table "public"."elicit_messages" add column "img_url" character varying;

grant delete on table "public"."elicit_messages" to "postgres";

grant insert on table "public"."elicit_messages" to "postgres";

grant references on table "public"."elicit_messages" to "postgres";

grant select on table "public"."elicit_messages" to "postgres";

grant trigger on table "public"."elicit_messages" to "postgres";

grant truncate on table "public"."elicit_messages" to "postgres";

grant update on table "public"."elicit_messages" to "postgres";


  create policy "conversation_delete_own"
  on "public"."elicit_conversations"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "elicit_messages_insert_own"
  on "public"."elicit_messages"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "conversations_insert_own"
  on "public"."elicit_conversations"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "conversations_select_own"
  on "public"."elicit_conversations"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "conversations_update_own"
  on "public"."elicit_conversations"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "elicit_messages_delete_own"
  on "public"."elicit_messages"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "elicit_messages_select_own"
  on "public"."elicit_messages"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "elicit_messages_update_own"
  on "public"."elicit_messages"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



