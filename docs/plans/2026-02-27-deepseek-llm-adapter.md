# DeepSeek LLM Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add DeepSeek support via `@langchain/deepseek` and select provider via env.

**Architecture:** Extend the health LLM factory to branch on `HEALTH_LLM_PROVIDER` and instantiate either the existing Zhipu model or a DeepSeek chat model. Use `HEALTH_LLM_MODEL` to override defaults. Read DeepSeek secrets from `DEEPSEEK_API_KEY` and optional `DEEPSEEK_BASE_URL`.

**Tech Stack:** Next.js App Router, TypeScript, LangChain, Zhipu, DeepSeek.

---

### Task 1: Add DeepSeek model factory

**Files:**
- Modify: homemate/src/lib/health/llm.ts

**Step 1: Write the failing test**

Skip for now (no existing unit test harness for LLM factories).

**Step 2: Write minimal implementation**

- Import `ChatDeepSeek` (or the relevant class) from `@langchain/deepseek`.
- Add `HEALTH_LLM_PROVIDER` switch: `deepseek` or `zhipu`.
- Default model when `deepseek`: `deepseek-chat` unless `HEALTH_LLM_MODEL` is set.
- Read `DEEPSEEK_API_KEY` and optional `DEEPSEEK_BASE_URL`.
- Keep current Zhipu defaults untouched.

**Step 3: Manual check**

Set env vars to DeepSeek and validate one health chat call works.

---

### Task 2: Update env templates/docs

**Files:**
- Modify: homemate/.env.example (or relevant env template)
- Modify: docs or README if environment docs exist

**Step 1: Add env keys**

Add:
- `HEALTH_LLM_PROVIDER=deepseek|zhipu`
- `HEALTH_LLM_MODEL=deepseek-chat`
- `DEEPSEEK_API_KEY=`
- `DEEPSEEK_BASE_URL=` (optional)

---

Plan complete and saved to docs/plans/2026-02-27-deepseek-llm-adapter.md. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
