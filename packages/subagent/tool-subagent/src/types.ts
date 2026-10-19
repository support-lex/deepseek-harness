/**
 * The subagent-delegation selection vocabulary shared by the tool plugin, the
 * per-session selection ref, and typed consumers. Keeping it free of Host
 * imports lets `@deepseek-ai/dsh-tool-subagent/client` re-export it into
 * browser programs.
 *
 * @module @deepseek-ai/dsh-tool-subagent/types
 */

/**
 * One model-facing subagent delegation tool instance and the provider it can
 * delegate to. The instance names its `toolName` because several instances may
 * coexist in one composition (one per provider); the roster identifies them by
 * that name.
 */
export interface SubagentProviderOption {
  /** Model-facing tool name of this delegation instance (`subagent`, `subagent_codex`, …). */
  readonly tool: string
  /** The `ctx.subagents` provider the instance delegates to (`spawn`, `codex`, …). */
  readonly provider: string
}

/** What one session's delegation selection resolves to. */
export type SubagentSelection =
  /** The named instance delegates to its configured provider. */
  | { readonly kind: 'instance'; readonly tool: string }
  /** The model cannot delegate in this session. */
  | { readonly kind: 'disabled' }

/**
 * Mutable per-session delegation selection, owned by the entry point that
 * serves that session (the Web gateway installs one per agent). Reads happen at
 * delegation resolution, so a switch reaches the next delegation and never
 * splits a run already in flight.
 */
export interface SubagentSelectionRef {
  /** The selection subsequent delegations resolve under. */
  current: SubagentSelection | undefined
}
