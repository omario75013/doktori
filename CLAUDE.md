# Doktori — agent instructions

## Read this first on every session

Before exploring the repo, load the compressed project context from Obsidian:

**`C:\Users\user2024\Documents\Obsidian Vault\Claude Projects\doktori\CONTEXT.md`**

It holds the current state of the project: stack, active focus, non-obvious rules, key file pointers, recent big changes. Reading it once at session start saves re-exploring the repo every time and gives you a much denser mental model in fewer tokens.

Also scan the memory index:

**`C:\Users\user2024\Documents\Obsidian Vault\Claude Projects\doktori\MEMORY.md`**

Individual memories live in `...\doktori\memories\*.md`. Your auto-memory system already writes there — the directory is junctioned to `~/.claude/projects/C--Users-user2024-Desktop-doktori/memory`. So when you save a new memory, it appears in Obsidian automatically, and when the user edits a memory in Obsidian, you read the updated version next session.

## When CONTEXT.md is wrong

If you discover something in the code that contradicts `CONTEXT.md`, update `CONTEXT.md` — don't let it drift. The cost of one Edit call is repaid the next session.

## Working directory
`C:\Users\user2024\Desktop\doktori` (pnpm monorepo — see CONTEXT.md for layout).
