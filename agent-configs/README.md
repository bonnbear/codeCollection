# agent-configs

OpenCode / Codex / OpenClaw 三套 AI 编码代理的 **Skills** 与 **配置**集成。
所有密钥已脱敏为 `${ENV_VAR}` 占位符，使用前请参考根目录 `.env.example` 填入自己的密钥。

## 目录结构

```
agent-configs/
├── opencode/
│   ├── opencode.jsonc      # 脱敏配置（MCP: notion/github/codegraph + provider）
│   └── skills/             # 25 个 skill
├── codex/
│   ├── config.toml         # 脱敏配置（MCP: notion/codegraph）
│   └── skills/             # 27 个 skill（含 6 个 Codex 系统 skill）
└── openclaw/
    └── openclaw.json       # 脱敏配置（providers/agents/skills/gateway）
```

## Skills 一览

### OpenCode (`opencode/skills/`)
algorithmic-art · analyze-mode · brand-guidelines · canvas-design · deploy-to-vercel ·
doc-coauthoring · docx · frontend-design · internal-comms · mcp-builder · pdf · pptx ·
search-mode · skill-creator · skill-writer · slack-gif-creator · theme-factory ·
vercel-cli-with-tokens · vercel-composition-patterns · vercel-react-best-practices ·
vercel-react-native-skills · web-artifacts-builder · web-design-guidelines · webapp-testing · xlsx

### Codex (`codex/skills/`)

系统 Skill：imagegen · openai-docs · plugin-creator · review-agent · skill-creator · skill-installer

用户级 Skill：aspnet-core · code-review · doc · domain-modeling · element-plus-vue3 ·
gh-address-comments · gh-fix-ci · grill-with-docs · grilling · image-to-ui-skill · implement ·
notion-knowledge-capture · notion-meeting-intelligence · notion-research-documentation ·
notion-spec-to-implementation · openclaw-opencode-model-config · setup-matt-pocock-skills ·
tdd · to-spec · to-tickets · triage

`codex-skills.tar.gz` 是上述 Codex Skills 的便携压缩包，`codex-skills.tar.gz.sha256`
用于下载后的完整性校验。

## 安装

将对应目录的内容放回各 agent 的配置根目录：

| Agent    | 配置文件位置                          | Skills 位置                     |
|----------|---------------------------------------|---------------------------------|
| OpenCode | `~/.config/opencode/opencode.jsonc`   | `~/.config/opencode/skills/`    |
| Codex    | `~/.codex/config.toml`                | `~/.codex/skills/`              |
| OpenClaw | `~/.openclaw/openclaw.json`           | （内置 plugin-skills）          |

```bash
# 示例：安装 opencode skills
cp -R agent-configs/opencode/skills/* ~/.config/opencode/skills/
cp agent-configs/opencode/opencode.jsonc ~/.config/opencode/opencode.jsonc
```

> ⚠️ 配置文件中的 `${...}` 占位符需替换为真实密钥（推荐用环境变量注入），
> 切勿把真实密钥提交回仓库。
