## OpenSpec agent delegation

Keep every OpenSpec skill in the current parent context and preserve its original workflow, artifact rules, lifecycle, and conversation with the user.

The parent OpenSpec skill owns all clarifications and decisions. Ask the user directly about missing requirements, scope, architecture, contracts, trade-offs, acceptance criteria, conflicts, and approvals.

Use `.claude/ai-orchestration/policy.md` to delegate only bounded discovery, analysis, approved implementation, deterministic verification, and read-only review. Subagents must return `clarification_required` instead of deciding or asking the user themselves.

Parallelize only independent work. The parent retains OpenSpec artifact writes, checklist updates, result integration, sync, and archive.

## How to work

Prefer work with worktrees, avoid work directly in main. When working with worktrees, keep the worktree in .claude/worktrees/.
When finish work in a worktree, ask for achive the change, after merge in main, clear the worktree, purging local branch also.
Whether a worktree is behind the main branch, rebase it with main and sync the worktree.
