# OpenSpec agent execution policy

## Goal

Preserve the native OpenSpec workflow while using specialized agents only to reduce token cost, improve important outputs, and parallelize independent implementation work.

## Authority boundary

The active OpenSpec skill running in the parent context is the sole workflow owner.

The parent OpenSpec skill must:

- preserve the original phase order, artifact rules, lifecycle, and user-facing conversation;
- ask the user every clarification question directly;
- keep ownership of requirements, scope, architecture choices, trade-offs, acceptance criteria, approvals, and final conclusions;
- write or update OpenSpec artifacts only after required user decisions are resolved;
- decide operational routing to agents without changing product or technical scope.

Subagents must never:

- decide an unresolved requirement, scope, architecture, contract, or trade-off;
- invent missing requirements or silently choose an assumption;
- ask the user directly;
- change task boundaries or acceptance criteria;
- update OpenSpec artifacts, task checkboxes, approve a change, sync specs, or archive a change;
- expand their assignment because they found adjacent work.

When a subagent cannot continue without a decision, it must stop and return:

```text
clarification_required:
- question: <one concrete question for the user>
- reason: <why execution depends on the answer>
- evidence: <files, symbols, scenarios, or constraints>
- options: <known options and trade-offs, without selecting one>
```

The parent OpenSpec skill then asks the user and resumes only after the answer.

## Execution tiers

Tier selection is an operational model-routing choice only. It must not alter requirements, design, scope, or task order.

### Lite

Use for bounded, deterministic, low-risk work:

- targeted code discovery;
- file and symbol lookup;
- summarization;
- formatting or documentation-only edits;
- focused test, lint, build, or type-check execution;
- small implementation that follows an existing pattern exactly.

### Standard

Use for an approved implementation task with clear acceptance criteria, limited blast radius, and an established project pattern.

### Deep

Use a stronger model for analysis, implementation, or review when the approved task involves:

- security, authentication, authorization, secrets, cryptography, or PII;
- payments, billing, financial calculations, or irreversible operations;
- schema or data migrations;
- concurrency, idempotency, consistency, retries, queues, caches, or distributed systems;
- public APIs, events, schemas, or compatibility requirements;
- broad refactors, performance-sensitive paths, or multiple subsystems;
- complex failure modes or a high cost of incorrect implementation.

Complexity does not grant decision authority. A Deep agent must still stop and request clarification when approved artifacts do not determine the answer.

## Phase behavior

### explore

1. The parent skill preserves the native OpenSpec exploration conversation.
2. Delegate independent read-only investigations to Lite scouts in parallel when useful.
3. Use the Deep analyst for complex evidence analysis, alternatives, risks, or contradictions.
4. Agents return evidence, options, trade-offs, and clarification requests.
5. The parent synthesizes results and continues the conversation with the user.
6. Do not create or modify change artifacts during exploration.

### propose, new, continue, and ff

1. The parent skill controls the native artifact workflow.
2. Use Lite scouts to collect current-state repository evidence.
3. Use the Deep analyst to identify gaps, scenarios, risks, contradictions, and possible alternatives.
4. Agents may draft content only from approved requirements and repository evidence.
5. Any unresolved choice is returned as `clarification_required`.
6. The parent asks the user, records the answer, and writes the final OpenSpec artifacts.

### apply

1. The parent reads the approved proposal, specs, design, and tasks.
2. Delegate only approved and bounded tasks.
3. Use Lite, Standard, or Deep workers according to implementation complexity and risk.
4. Workers implement; they do not redesign, reinterpret, or broaden the task.
5. The parent may run independent tasks in parallel only when their files, contracts, state, and validation do not overlap.
6. Each parallel writer must use an isolated worktree or equivalent isolation.
7. Integrate parallel results sequentially in the parent context.
8. Run focused validation for each task.
9. Only the parent updates the OpenSpec checkbox after successful validation.
10. Any missing decision returns to the user through the parent skill.

### verify

1. Delegate deterministic commands to the Lite verifier.
2. Use the Deep reviewer for important correctness, security, compatibility, concurrency, data, or specification analysis.
3. Reviewers report findings and evidence; they do not approve, reject, or alter the change.
4. The parent compares findings with OpenSpec scenarios and presents the final verification result.
5. Conflicts requiring a choice are asked directly to the user.

### sync, archive, and bulk-archive

1. The parent preserves and executes the native OpenSpec workflow.
2. Lite agents may inspect deltas, completeness, and deterministic checks.
3. The Deep analyst may explain conflicts or behavior/spec divergence.
4. Agents must not sync or archive.
5. The parent asks the user about unresolved conflicts and performs the final operation only through the original OpenSpec flow.

## Parallelization rules

Parallelize only when coordination costs less than the work and the assignments are independent.

Safe parallel work:

- read-only discovery in separate areas;
- independent test suites or static checks;
- approved implementation tasks with non-overlapping files, contracts, data, and generated artifacts;
- independent read-only reviews.

Do not parallelize:

- tasks that edit the same files or shared interfaces;
- producer and consumer changes before their contract is fixed;
- migrations and code that depends on the migration;
- sequential tasks whose output defines the next task;
- OpenSpec artifact creation, clarification, approval, checklist updates, sync, or archive.

Default maximum: four subagents. Use fewer when the work is small.

## Context and token rules

- Give each agent only its bounded assignment, relevant files, approved constraints, and acceptance criteria.
- Prefer targeted search and small reads over entire-directory ingestion.
- Return concise evidence, changed files, commands, and results instead of raw logs.
- Do not spawn an agent when coordination costs more than the task.
- Reuse parent context summaries instead of making every agent rediscover the same information.

## Agent response contract

Every subagent response must include:

- `status`: `completed`, `blocked`, or `failed`;
- `scope`: the exact bounded assignment performed;
- `evidence`: relevant files, symbols, commands, or scenarios;
- `result`: findings, changes, or validation outcome;
- `clarification_required`: present only when a user decision is needed;
- `risks`: remaining risks inside the assigned scope.
