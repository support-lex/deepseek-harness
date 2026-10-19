/**
 * Per-session delegation selection: the entry point that serves a session
 * installs one {@link SubagentSelectionRef} on the delegating agent's scope,
 * and every delegation resolves against it before the call dispatches. Two
 * registry mechanisms enforce the pick with one visibility: a per-agent tool
 * restriction removes the unselected delegation schemas from that agent's
 * assembly, and the delegation tool bodies refuse the same names at execution,
 * so a model cannot route around the pick with another instance's spelling.
 *
 * @module @deepseek-ai/dsh-tool-subagent/selection
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SubagentSelection, SubagentSelectionRef } from './types.ts'

/**
 * The selection an agent resolves when no entry point installed a ref: every
 * registered delegation instance stays available (the pre-selection behavior).
 */
const FALLBACK_SELECTION: SubagentSelection = { kind: 'instance', tool: '' }

/**
 * Resolve which delegation tool name this session's delegations route through,
 * reading the agent's installed selection at call time so a switch reaches the
 * next delegation and never splits a run already in flight.
 * @param agent - the delegating agent, or `undefined` for a caller with none.
 * @param fallback - the selection to use when no ref is installed; defaults to
 *   a `kind: 'instance'` naming the empty tool, and callers substitute their
 *   configured default for the empty name.
 * @returns the installed selection, or `fallback` when none is installed.
 */
export function subagentSelectionFor(
  agent: Agent | undefined,
  fallback: SubagentSelection = FALLBACK_SELECTION,
): SubagentSelection {
  // A minimal test double or a caller that supplies no scoped world resolves to
  // the fallback: every instance stays available unless the caller says otherwise.
  const agentCtx = agent?.ctx
  const ref = agentCtx === undefined ? undefined : agentCtx.get('subagentSelection') as SubagentSelectionRef | undefined
  return ref?.current ?? fallback
}

/**
 * Couple one mutable per-session selection to the delegating agent's scope.
 * @param agentCtx - the selected Agent's scoped context.
 * @param selection - mutable selection owned by the calling entry point.
 * @returns disposer releasing the scoped registration.
 */
export function installSubagentSelection(agentCtx: Context, selection: SubagentSelectionRef): () => void {
  return agentCtx.effect(
    () => agentCtx.provide('subagentSelection', selection),
    'tool-subagent: per-session delegation selection',
  )
}

/**
 * Hide every delegation tool name except the selected one inside one agent's
 * scope. The restriction is the visibility half of the enforcement: the
 * registry removes the unselected schemas from the agent's assembly, and the
 * delegation tool bodies refuse the same names at execution, so a model cannot
 * route around the pick with another instance's spelling.
 * @param agentCtx - the selected Agent's scoped context.
 * @param selection - mutable selection owned by the calling entry point.
 * @param toolNames - every registered delegation tool name the deployment exposes.
 * @returns disposer lifting the restriction (agent disposal also releases it).
 */
export function restrictSubagentSelection(
  agentCtx: Context,
  selection: SubagentSelectionRef,
  toolNames: readonly string[],
): () => void {
  if (toolNames.length === 0) return () => {}
  return agentCtx.effect(() => agentCtx.tools.restrict({
    allow: toolNames.filter((name) => {
      const current = selection.current
      return current !== undefined && current.kind === 'instance' && current.tool === name
    }),
  }), 'tool-subagent: delegation selection restriction')
}

/**
 * Model-facing wording naming the tool this session's delegations use, for a
 * delegation description assembled under a session-scoped selection.
 * @param toolName - the resolved delegation tool name (empty when none).
 * @returns a sentence fragment for a tool description, empty for the empty name.
 */
export function subagentSelectionWording(toolName: string): string {
  return toolName === ''
    ? ''
    : ` This session's delegations go through the \`${toolName}\` tool.`
}
