# Health Agent Chat Tools and Multi-turn Chat Design

Date: 2026-02-27

## Overview
Add multi-turn chat to the health agent, fix tool message handling, and add a full-week regeneration tool that only updates the active tab (meals or workouts). Keep the existing regenerate-week route for UI use. Use the Zhipu tool-compatible model wrapper to prevent tool message errors.

## Goals
- Support multi-turn agent chat with a bounded history window.
- Fix "Unknown message type: tool" errors in agent chat.
- Add a tool to regenerate the current week for the active tab only.
- Keep single-meal suggestion tool non-mutating.
- Keep existing regenerate-week route behavior unchanged.

## Non-goals
- No cross-tab regeneration in one tool call.
- No new UI for regeneration beyond current chat entry points.
- No model provider change.
- No schema changes beyond the existing recipe fields.

## Current State
- Agent chat uses LangChain createAgent with tools and ZhipuAI.
- Tool messages from the agent cause a Zhipu role mapping error.
- Client sends only the latest user message; no history.
- regenerate-week route generates both meals and workouts for the week.

## Proposed Changes

### Client: Health Chat
- Build a history payload from the latest 12 completed messages in the active tab.
- Exclude loading and error placeholders.
- Send history as `{ role, content }[]` alongside the current message.
- Keep context payload (weekStart, timezone, selected slot).

### Server: Agent Chat Route
- Accept `history` as an array of `{ role, content }`.
- Sanitize history:
  - Only allow `user` and `assistant` roles.
  - Drop empty or whitespace-only content.
  - Cap at 12 messages, keep oldest first.
- Construct agent messages as:
  1) system prompt
  2) sanitized history
  3) user message with current text + context JSON
- Keep body metrics confirmation gate as-is.

### Tools: Full-week Regeneration
- Add a new tool, e.g. `regenerate_week_plan`.
- Inputs: `{ weekStart, view, timezone, goal, allowMissingBodyMetrics? }`.
- Behavior:
  - If view is `meals`, regenerate meal week/day plans only.
  - If view is `workouts`, regenerate workout week/day plans only.
  - Use the same prompt schema and parsing logic as regenerate-week.
- Return a short status string for the agent to relay.

### Tool Message Handling
- Use `ChatZhipuAIToolCompatible` in all agent flows.
- Convert tool messages to assistant text before sending to ZhipuAI.

## Error Handling
- Invalid input returns 400 from the agent route.
- Missing body metrics triggers confirmation response (no tool use).
- Tool failures return concise strings to the agent.
- Agent failures return 502 with a generic error message.

## Testing
- Unit test history sanitization and length capping.
- Verify agent route accepts history and returns a response.
- Verify tool regenerates only the active tab.
- Keep UI tests optional; focus on route and tool logic first.

## Rollout
- Ship code behind existing UI; no migration needed.
- Validate by manual chat flow and one tool-triggered regeneration.
