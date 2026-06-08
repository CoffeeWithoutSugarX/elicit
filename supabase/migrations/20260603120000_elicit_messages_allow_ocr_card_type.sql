-- 放开 elicit_messages.type 约束，允许 type=3（OCR_CARD 已确认题目卡，详设 P-103）
alter table public.elicit_messages
  drop constraint if exists elicit_messages_type_check;
alter table public.elicit_messages
  add constraint elicit_messages_type_check check (type in (1, 2, 3));
