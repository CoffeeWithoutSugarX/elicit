-- 迁移：elicit_messages 表补齐概要设计 v0.1 规约
-- 依赖：20260520000001_elicit_conversations_v01_mvp_schema.sql 中定义的 set_updated_at()

-- ============================================================
-- 1. 清理 POC 重复行（幂等保护：CR-001）
--    保留每个 (conversation_id, message_id) 组合中 id 最小的行
-- ============================================================
delete from public.elicit_messages
where id not in (
    select min(id)
    from public.elicit_messages
    group by conversation_id, message_id
);

-- ============================================================
-- 2. 公共字段：version / is_deleted / ext_info
-- ============================================================
alter table public.elicit_messages
  add column if not exists "version"    integer not null default 0,
  add column if not exists "is_deleted" boolean not null default false,
  add column if not exists "ext_info"   jsonb   not null default '{}'::jsonb;

-- ============================================================
-- 3. 业务字段：phase / metadata
-- ============================================================
alter table public.elicit_messages
  add column if not exists "phase"    smallint,
  add column if not exists "metadata" jsonb not null default '{}'::jsonb;

-- ============================================================
-- 4. role 列类型迁移：varchar('user'/'assistant') → smallint(0/1)
--    breaking：POC 数据可接受转换
-- ============================================================
alter table public.elicit_messages
  alter column "role" type smallint
    using case
      when role = 'user'      then 0
      when role = 'assistant' then 1
      else 0
    end;

-- ============================================================
-- 5. 修正 conversation_id 的错误默认值（移除 gen_random_uuid()）
-- ============================================================
alter table public.elicit_messages
  alter column "conversation_id" drop default;

-- ============================================================
-- 6. 收紧 user_id 为 NOT NULL
-- ============================================================
alter table public.elicit_messages
  alter column "user_id" set not null;

-- ============================================================
-- 7. 收紧 img_url 上限（varchar 无上限 → varchar(512)）
-- ============================================================
alter table public.elicit_messages
  alter column "img_url" type varchar(512);

-- ============================================================
-- 8. check 约束：枚举白名单
-- ============================================================
alter table public.elicit_messages
  add constraint elicit_messages_role_check
    check (role in (0, 1)),
  add constraint elicit_messages_type_check
    check (type in (1, 2)),
  add constraint elicit_messages_phase_check
    check (phase is null or phase in (0, 1, 2, 3, 4));

-- ============================================================
-- 9. 唯一索引：(conversation_id, message_id) 幂等保护
-- ============================================================
create unique index if not exists elicit_messages_message_id_unique
  on public.elicit_messages (conversation_id, message_id);

-- ============================================================
-- 10. 普通索引：(conversation_id, created_at) 历史消息加载
-- ============================================================
create index if not exists elicit_messages_conversation_id_idx
  on public.elicit_messages (conversation_id, created_at asc);

-- ============================================================
-- 11. updated_at 触发器（复用 conversations 迁移定义的函数）
-- ============================================================
create trigger elicit_messages_set_updated_at
  before update on public.elicit_messages
  for each row execute function public.set_updated_at();
