# Agent Note: 每会话委派选择

Status: implemented

[English](2026-10-19-per-session-delegation-selection.md) | 中文

本记录拥有每个会话经由哪个 subagent 委派工具路由委派的选择。它建立在 [subagent 能力接缝](2026-06-21-subagent-capability-seam.md)之上，不改变其提供方约定。

## 问题

一个组合可以加载多个 `dsh-tool-subagent` 实例，每个提供方一个（`spawn`、`fork`、`codex`、`claude-code` 等），各自使用不同的 `toolName`。每个实例都对模型可见，因此一个会话会同时看到所有委派拼写，必须猜测用户想要哪一个。这个选择是会话级偏好——一个会话可能想要 `spawn` 子 agent，另一个想要 `codex`——但在此之前，唯一的选择方式是修改组合，而组合是进程全局的。

会话级选择必须在不影响已在进行的运行的前提下作用于下一次委派，而且模型不能通过命名另一个实例来绕过该选择。

## 决策

一个会话在每次委派时解析一个委派选择。该选择是一个 `SubagentSelectionRef`——可变的 `current: SubagentSelection`，其中 `SubagentSelection` 是 `{ kind: 'instance', tool }` 或 `{ kind: 'disabled' }`——由为该会话服务的入口安装在委派 agent 的作用域上（`installSubagentSelection`）。未安装 ref 时，`subagent-delegation` 设置段提供回退值；若也没有设置值，则每个实例都保持可用（选择前的行为）。

强制执行只有一层可见性。每个 agent 的工具限制会把未选中的委派 schema 从该 agent 的组装中移除，而委派工具主体会拒绝选择未命名的拼写。`kind: 'disabled'` 的选择会拒绝一切委派。`subagent-selection:<toolName>` 提示词 section 会命名该会话唯一的拼写，使模型无法在同级实例之间猜测。

## 考虑过的替代方案

- **在一个合并工具上加模型可见的 `provider` 参数。** 拒绝：模型会看到它用不到的传输词汇，而且单一工具会丢失每个实例已有的按提供方措辞（`inheritsParentContext`）。
- **只有设置项、没有每会话 ref 的选择。** 拒绝：设置段是进程全局的，一个会话的选择会泄漏到其他所有会话。ref 是每会话机制；设置只是它的回退。
- **只有每 agent 工具限制、没有主体检查。** 拒绝：限制在注册时计算，因此注册后移动的选择会保持旧的可见性直到下一次组装。主体检查携带实时选择并消除该缺口。

## 后果

- `subagent-delegation` 设置段（`tool`、`enabled`）是 agent 在没有入口安装自己的 ref 时解析的用户对比回退，因此用户的选择在网关无需知情的情况下作用于每个会话。
- 会话的委派选择在每次委派时读取，因此切换会作用于下一次委派，绝不会拆分已在进行的运行。
- `subagent-selection:<toolName>` 提示词 section 命名该会话唯一的委派拼写，使模型无法在同级实例之间猜测。

## 验证

- `packages/subagent/tool-subagent/tests/tool-subagent.spec.ts` 通过 `ctx.tools.execute` 针对真实工具注册表，覆盖选中实例路由、禁用选择、无选择回退和设置支撑的选择。
