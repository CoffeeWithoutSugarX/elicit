-- 放开 elicit_messages.type 约束，允许 type=4（KNOWLEDGE_CARD P-105 知识卡片，详设 P-105）
alter table public.elicit_messages
  drop constraint if exists elicit_messages_type_check;
alter table public.elicit_messages
  add constraint elicit_messages_type_check check (type in (1, 2, 3, 4));
