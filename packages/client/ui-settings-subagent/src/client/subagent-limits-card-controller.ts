/** Staged delegation limits backed by the Host's subagent settings section. */

import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel, settingsNumberField, settingsTextField,
  type SettingsFieldSpec, type SettingsFieldState, type SettingsFormActions, type SettingsFormScope, type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** Host-owned delegation defaults, live capacity, and delegation selection. */
export interface SubagentLimitsSettings {
  maxDepth: number
  maxActiveSubagents: number
  delegationTool?: string
  delegationEnabled?: boolean
}

/** Effective values and drafts presented by the limits card. */
export interface SubagentLimitsCardState extends SettingsFormShell {
  maxDepth: SettingsFieldState
  maxActiveSubagents: SettingsFieldState
  delegationTool: SettingsFieldState
  delegationEnabled: boolean
}

/** Actions and observable state bound by the slot renderer. */
export interface SubagentLimitsCardFace extends SettingsFormActions {
  hooks: {
    subagentLimitsCard: SnapshotStore<SubagentLimitsCardState>
  }
  /** Stage the delegation-enabled flag alongside the form's text fields. */
  setDelegationEnabled: (enabled: boolean) => void
}

function limitField(field: keyof SubagentLimitsSettings, minimum: number): SettingsFieldSpec {
  const numeric = settingsNumberField(field)
  return {
    ...numeric,
    parse: (text) => {
      const write = numeric.parse(text)
      if (write?.kind !== 'set') return write
      const value = write.value as number
      return Number.isSafeInteger(value) && value >= minimum && !Object.is(value, -0) ? write : undefined
    },
  }
}

/** Bind two independently resettable limits to one staged settings form. */
export class SubagentLimitsCardController {
  private readonly form: SettingsFormModel<SubagentLimitsSettings>
  private readonly store: SnapshotStore<SubagentLimitsCardState>
  private delegationEnabled: boolean | undefined

  /** @param scope - The Host's `subagent` settings section. */
  constructor(scope: SettingsFormScope<SubagentLimitsSettings>) {
    this.form = new SettingsFormModel(scope, [
      limitField('maxDepth', 0),
      limitField('maxActiveSubagents', 1),
      settingsTextField('delegationTool'),
    ])
    this.store = this.form.bind(() => ({
      ...this.form.shell(),
      maxDepth: this.form.field('maxDepth'),
      maxActiveSubagents: this.form.field('maxActiveSubagents'),
      delegationTool: this.form.field('delegationTool'),
      delegationEnabled: this.delegationEnabled ?? true,
    }))
  }

  /**
   * Bind the limits editor to the slot renderer.
   * @returns The limits snapshot and staged write actions.
   */
  inject(): SubagentLimitsCardFace {
    return {
      hooks: { subagentLimitsCard: this.store },
      ...this.form.actions(),
      setDelegationEnabled: (enabled: boolean) => {
        this.delegationEnabled = enabled
        this.form.actions().edit('delegationTool', this.store.getSnapshot().delegationTool.text)
      },
    }
  }

  /** Release accepted-value subscriptions. */
  dispose(): void { this.form.dispose() }

}
