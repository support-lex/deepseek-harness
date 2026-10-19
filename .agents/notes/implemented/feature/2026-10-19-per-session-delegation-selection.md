# Agent Note: Per-session delegation selection

Status: implemented

English | [中文](2026-10-19-per-session-delegation-selection.zh.md)

This record owns the per-session choice of which subagent delegation tool a session routes its delegations through. It sits on top of the [subagent capability seam](2026-06-21-subagent-capability-seam.md) without changing its provider contract.

## Problem

A composition may load several `dsh-tool-subagent` instances, one per provider (`spawn`, `fork`, `codex`, `claude-code`, …), each under a distinct `toolName`. Every instance is model-visible, so a session sees every delegation spelling at once and must guess which one its user wants. The choice is a session-level preference — one session may want `spawn` children while another wants `codex` — but before this change the only way to pick was to change the composition, which is process-global.

A per-session choice has to reach the next delegation without splitting a run already in flight, and a model must not be able to route around the pick by naming another instance.

## Decision

One session resolves one delegation selection at delegation time. The selection is a `SubagentSelectionRef` — a mutable `current: SubagentSelection` where `SubagentSelection` is `{ kind: 'instance', tool }` or `{ kind: 'disabled' }` — installed on the delegating agent's scope by the entry point that serves that session (`installSubagentSelection`). With no ref installed, the `subagent-delegation` settings section supplies the fallback, and with no settings value every instance stays available (the pre-selection behavior).

Enforcement is one visibility. A per-agent tool restriction removes the unselected delegation schemas from that agent's assembly, and the delegation tool bodies refuse a spelling the selection does not name. A `kind: 'disabled'` selection refuses every delegation. The `subagent-selection:<toolName>` prompt section names the session's one spelling so the model cannot guess between sibling instances.

## Alternatives considered

- **A model-visible `provider` parameter on one merged tool.** Rejected: the model would see transport vocabulary it has no use for, and a single tool would lose the per-provider wording (`inheritsParentContext`) each instance already derives.
- **A settings-only pick with no per-session ref.** Rejected: a settings section is process-global, so one session's choice would leak to every other. The ref is the per-session mechanism; settings is only its fallback.
- **A per-agent tool restriction without the body check.** Rejected: a restriction is computed at registration, so a selection that moves after registration would leave the old visibility until the next assembly. The body check carries the live selection and closes that gap.

## Consequences

- The `subagent-delegation` settings section (`tool`, `enabled`) is the user-facing fallback an agent resolves when no entry point installs its own ref, so a user pick reaches every session without the gateway having to know about it.
- A session's delegation selection is read at delegation time, so a switch reaches the next delegation and never splits a run already in flight.
- The `subagent-selection:<toolName>` prompt section names the session's one delegation spelling, so the model cannot guess between sibling instances.

## Verification

- `packages/subagent/tool-subagent/tests/tool-subagent.spec.ts` covers the selected-instance routing, the disabled selection, the no-selection fallback, and the settings-backed pick — all through `ctx.tools.execute` against the real tool registry.
