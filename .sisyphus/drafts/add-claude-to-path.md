# Draft: Add Claude to PATH

## Requirements (confirmed)
- 将 claude 加入环境变量里面

## Technical Decisions
- Shell: zsh (`/bin/zsh`)，优先更新 `~/.zshrc`
- PATH entry: `export PATH="$HOME/.local/bin:$PATH"`
- Verification: use `source ~/.zshrc`, `echo $PATH`, `command -v claude`, and `claude --help`

## Research Findings
- `/Users/lirunzhao/.zshrc` exists
- `/Users/lirunzhao/.zprofile` exists
- `claude` binary installed under `~/.local/bin/claude`

## Open Questions
- None

## Scope Boundaries
- INCLUDE: append/update PATH config for Claude in user shell startup config; verify current shell can resolve `claude`
- EXCLUDE: reinstall Claude, change non-zsh shells, system-wide PATH changes
