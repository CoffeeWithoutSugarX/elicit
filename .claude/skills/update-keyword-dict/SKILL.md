---
name: update-keyword-dict
description: 更新 src/agents/data/*-keywords.json 守卫词典，走详设 §6.4.2 定义的 staging → pnpm evals 回归 → 决策矩阵 → merge 流程。用于 StuckGuard / DeviationGuard / OutOfScopeGuard 词典维护。词典更新走独立 dict-PR，不混在功能 PR。
disable-model-invocation: true
---

# 守卫词典更新流程

> **权威定义**：`doc/详细设计/详细设计_v0.1_MVP.md` §6.4.2
> **硬约束**：词典更新走**独立的 dict-PR**，不混在功能 PR 里（CLAUDE.md + 详设 §6.4.2 双承诺）

## 适用场景（任一即可触发本流程）

1. **L6 evals 反哺**：某剧本 judge 分 ≤ 3.0 且失败原因定位到守卫漏命中（见 `evals/failed_cases.json`）
2. **真实会话抽样**：muzi 月度评审妹妹真实对话，发现 ≥ 2 个新表述未命中已知守卫
3. **教材更新**：学年 / 学期教材术语更新（如新增章节关键词、考纲调整）

## Step 1 — 进 staging（不动 prod）

编辑 `src/agents/data/{name}-keywords.json`（name 是 `stuck` / `deviation` / `out-of-scope` 之一），**不要直接加进 prod 数组**。改成把候选词加入 JSON 顶层的 `_staging` 数组：

```json
{
  "match_mode": "contains",
  "give_answer": [ /* prod 不动 */ ],
  "off_topic": [ /* prod 不动 */ ],
  "_staging": ["新增候选词1", "新增候选词2"],
  "dict_version": 7
}
```

- 如果 `_staging` 字段不存在，**新建**它（首次使用本流程时）
- 候选词来源记录在 PR 描述里（"来自 evals/failed_cases.json 第 N 条" / "来自月度抽样会话 #1234"）

## Step 2 — 跑 evals 回归

```bash
pnpm evals
```

产出文件：
- `evals/baseline.json` — 当前基线（不要动）
- `evals/last_run.json` — 本次运行结果
- `evals/failed_cases.json` — 漏命中清单（供 Step 4 / 反哺循环用）

> ⚠️ Phase 3 才启用 L6 evals。如果 `pnpm evals` 命令尚未就绪，**本 skill 不可使用**，先等 Phase 3 测试体系落地。

## Step 3 — 决策矩阵

对比 `last_run` 与 `baseline` 的 14 剧本（E1~E14）**平均分**和**单项最大回退**：

| 平均分提升 | 单项最大回退 | 决策 |
|---|---|---|
| ≥ 0.3 | < 0.5 | ✅ **通过**，进 Step 4 |
| < 0.3 但无任一项回退 ≥ 0.5 | < 0.5 | ⛔ **暂停**，候选词改进 or 删除后回 Step 1 |
| 任一项 ≥ 0.5 | ≥ 0.5 | ⛔ **暂停**，找 muzi 显式 review（可能候选词带来场景偏移） |

## Step 4 — staging → prod，merge

决策通过后执行：

1. 把 `_staging` 数组的所有词搬入对应 prod 数组（`give_answer` / `off_topic` / `stuck` / `other_subject_phrases` 等）
2. 清空 `_staging: []`
3. `dict_version` +1
4. 更新 `evals/baseline.json` ← 本次 `last_run.json`（建立新基线）
5. 走 **独立的 dict-PR**（**禁止**混在功能 PR）
6. PR 标题模版：`chore(dict): 词典 v<N> 更新 — <name>-keywords +<新增词数> 词，剧本平均分 +<提升>`
7. PR 描述必须包含：
   - 候选词来源（reference 到 failed_cases / 真实会话 / 教材章节）
   - 14 剧本 baseline vs last_run 完整分数表
   - dict_version: 旧 → 新

## L6 evals 反哺循环（月度操作）

每月 muzi 评审 `evals/failed_cases.json`，结构：

```json
{
  "scenario_id": "E03",
  "user_utterance": "妹妹说的原话",
  "expected_guard": "StuckGuard",
  "actual_match": null,
  "dict_version": 6,
  "ts": "2026-05-21T10:30:00Z"
}
```

把 `actual_match: null` 且 `expected_guard` 明确的条目，按"漏命中守卫"分类（StuckGuard / DeviationGuard / OutOfScopeGuard），回到 Step 1 进 staging。

## 边界（硬约束）

- ⛔ **绝不动 prod 数组直接 merge** —— 必须经过 staging + 回归
- ⛔ **不允许把词典 PR 和功能 PR 合在一起** —— 否则功能 PR 会因 evals 分波动被错误归因
- ⛔ **L6 evals 分不阻断功能 PR**（CLAUDE.md 硬约束）——但本流程的回归对比是 **dict-PR 自身的强制 review gate**，不冲突
- ⚠️ 词典更新涉及大量 prompt 行为变化，merge 前**强烈建议**找 muzi review 一次

## 不在本流程范围

- ❌ **新建词典文件本身**（如新增 OffTopicGuard 词典）——这是详设变更，先改详设 §6.2 + §6.4 再来本流程
- ❌ **修改归一化规则**（详设 §6.4.1）——这是工程约定变更，需走详设 ADR 流程
- ❌ **词典内容大改 / 重组**（如把 `give_answer` 拆成 `give_numerical` + `give_choice`）——同上，先改详设
