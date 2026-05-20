-- 迁移：elicit_conversations 表补齐概要设计 v0.1 规约
-- 新增公共字段（version / is_deleted / ext_info）+ 业务字段（has_resolved / current_phase / problem_type）
-- 修正列类型（title → varchar(64)）+ 新增索引 + 触发器

-- ============================================================
-- 1. updated_at 触发器函数（两张业务表复用；conversations 先建）
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 2. 公共字段：version / is_deleted / ext_info
-- ============================================================
alter table public.elicit_conversations
  add column if not exists "version"    integer not null default 0,
  add column if not exists "is_deleted" boolean not null default false,
  add column if not exists "ext_info"   jsonb   not null default '{}'::jsonb;

-- ============================================================
-- 3. 业务字段：has_resolved / current_phase / problem_type
-- ============================================================
alter table public.elicit_conversations
  add column if not exists "has_resolved"  boolean  not null default false,
  add column if not exists "current_phase" smallint not null default 0,
  add column if not exists "problem_type"  smallint;

-- ============================================================
-- 4. 收紧 title 上限（varchar 无上限 → varchar(64)）
-- ============================================================
alter table public.elicit_conversations
  alter column "title" type varchar(64);

-- ============================================================
-- 5. check 约束：PolyaPhase 枚举白名单
-- 注意：problem_type 不加 DB check（最可能演化扩展，避免每加一个题型都要 alter table；
--       仅 TS Zod / ProblemTypeEnum 守门；见 §10 C13）
-- ============================================================
alter table public.elicit_conversations
  add constraint elicit_conversations_current_phase_check
    check (current_phase in (0, 1, 2, 3, 4));

-- ============================================================
-- 6. updated_at 触发器（before update）
-- ============================================================
create trigger elicit_conversations_set_updated_at
  before update on public.elicit_conversations
  for each row execute function public.set_updated_at();

-- ============================================================
-- 7. 索引：(user_id, created_at desc)——侧边栏会话列表排序
-- ============================================================
create index if not exists elicit_conversations_user_id_idx
  on public.elicit_conversations (user_id, created_at desc);
