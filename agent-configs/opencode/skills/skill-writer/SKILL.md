---
name: skill-writer
description: Design, validate, and write OpenCode SKILL.md definitions (project or global) for reusable agent behavior
compatibility: opencode
metadata:
  domain: tooling
  scope: skills
---

## What I do

I help you create new OpenCode agent skills (SKILL.md) that are discoverable and loadable via the `skill` tool.

Deliverables:

- A validated skill name + directory layout
- A complete `SKILL.md` file (with required YAML frontmatter)
- The exact install path(s) (project-local and/or global)
- Optional: a permissions snippet for `opencode.json` if you want to gate access

## When to use me

Use this when you say things like:

- "实现一个 skill"
- "写一个 OpenCode skill"
- "把这套流程做成可复用 skill"
- "做一个全局 skill"

If the request implies creating/maintaining skills, load this skill.

## First questions (ask before writing)

1) **Skill name** (lowercase with hyphens, 1–64 chars). Example: `search-mode`.
2) **One-sentence description** (1–1024 chars).
3) **Install scope**:
   - Project: `.opencode/skills/<name>/SKILL.md`
   - Global: `~/.config/opencode/skills/<name>/SKILL.md`
   - (Optional Claude-compatible mirrors): `.claude/skills/...` and `~/.claude/skills/...`
4) **Behavior**:
   - What should the agent do?
   - What must it NOT do?
   - What tools should it prefer/avoid?
5) **Output format** (what the skill should produce: plan, checklists, code changes, commands).

## Validation rules (must follow)

### File placement

Create one folder per skill and put `SKILL.md` inside it.

- Project config: `.opencode/skills/<name>/SKILL.md`
- Global config: `~/.config/opencode/skills/<name>/SKILL.md`
- Project Claude-compatible: `.claude/skills/<name>/SKILL.md`
- Global Claude-compatible: `~/.claude/skills/<name>/SKILL.md`

### Required frontmatter fields

The `SKILL.md` **must start** with YAML frontmatter. Only these fields are recognized:

- `name` (required)
- `description` (required)
- `license` (optional)
- `compatibility` (optional)
- `metadata` (optional, string-to-string map)

Unknown frontmatter fields are ignored.

### Name rules

`name` must:

- Be **1–64** characters
- Be lowercase alphanumeric with **single hyphen separators**
- Not start/end with `-`
- Not contain consecutive `--`
- Match the directory name

Regex:

```
^[a-z0-9]+(-[a-z0-9]+)*$
```

### Length rules

`description` must be **1–1024** characters and be specific enough to choose correctly.

## Writing guidelines (how to structure the skill)

Minimum recommended sections after frontmatter:

- `## What I do`
- `## When to use me`
- `## How I work` (step-by-step)
- `## Questions I will ask`
- `## Output format`

Keep instructions concrete and verifiable. Prefer checklists.

## Output format (for my response)

When I create a new skill, I output:

1) **Install paths** (project/global)
2) **Directory tree**
3) **Complete `SKILL.md` content** (copy-pasteable)
4) **Optional permissions** snippet for `opencode.json`

## Optional permissions snippet

To control which skills agents can access:

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

## Notes

- If a skill does not show up, verify: `SKILL.md` is all caps, frontmatter includes `name` and `description`, names are unique across locations, and permissions are not set to `deny`.
- For global portability across machines, keep the skill definitions in a git repo and sync them into `~/.config/opencode/skills/`.
