---
name: openclaw-opencode-model-config
description: Configure, compare, and verify model providers in OpenClaw and OpenCode. Use when the user asks to connect OpenClaw/OpenCode to a local or hosted model, add a provider such as BigModel/Zhipu/Ollama/Poe/OpenAI-compatible APIs, switch defaults, expose thinking/reasoning levels, test whether the model is reachable, or summarize reusable configuration for future model setup.
---

# OpenClaw/OpenCode Model Config

Use this workflow to make model configuration changes tangible: edit the real config files, preserve existing providers, and prove end-to-end operability with live model calls.

## Core Paths

- OpenClaw config: `~/.openclaw/openclaw.json`
- OpenCode config: `~/.config/opencode/opencode.jsonc`
- OpenCode data/logs: `~/.local/share/opencode`
- Useful checks:
  - `openclaw config validate`
  - `openclaw models list --provider <provider>`
  - `openclaw models status --plain`
  - `openclaw infer model run --local --model <provider/model> --prompt '请只回复 OK' --json`
  - `opencode debug config`
  - `opencode models <provider>`
  - `opencode run -m <provider/model> --pure '请只回复 OK'`

## Workflow

1. Inspect existing config before editing.
   - Use `jq` for OpenClaw JSON.
   - Use `sed` or a JSONC-aware check for OpenCode; do not assume comments are absent.
   - Check current defaults and existing provider names to avoid clobbering Poe/Ollama/OpenAI entries.

2. Test the upstream endpoint directly when possible.
   - For OpenAI-compatible chat APIs, send a minimal `curl` to `/chat/completions`.
   - Avoid shell-scoping mistakes: set API keys with `export KEY=...` before expanding them in headers.
   - Treat direct `curl` success as provider health; treat tool failures separately.

3. Back up configs before editing.
   - Example: `~/.openclaw/openclaw.json.bak-<provider>-<timestamp>`
   - Example: `~/.config/opencode/opencode.jsonc.bak-<provider>-<timestamp>`

4. Configure OpenClaw.
   - Add the provider under `models.providers`.
   - Add the model object with `id`, `name`, `api`, `reasoning`, `input`, `contextWindow`, and `maxTokens` when applicable.
   - Set `agents.defaults.model.primary` only when the user wants the new model as default.
   - Add per-model params under `agents.defaults.models["provider/model"]`.

5. Configure OpenCode.
   - Add the provider under `provider`.
   - For OpenAI-compatible endpoints use:
     - `npm: "@ai-sdk/openai-compatible"`
     - `options.baseURL`
     - `options.apiKey`
     - `models`
   - Set top-level `model` only when the user wants the new model as default.
   - Use `variants` when the user wants named modes or reasoning presets.

6. Verify both layers.
   - Validate config resolution first: `openclaw config validate`, `opencode debug config`, model list commands.
   - Then run real calls through OpenClaw and OpenCode.
   - If a CLI exits 0 but visible output is empty, retry with `--format json` or a slightly less terse prompt.

## BigModel/Zhipu GLM Notes

For BigModel/Zhipu GLM-5.2:

- API base URL: `https://open.bigmodel.cn/api/paas/v4`
- Model id: `glm-5.2`
- The API accepts:
  - `thinking: { "type": "enabled" | "disabled" }`
  - `reasoning_effort: "max" | "xhigh" | "high" | "medium" | "low" | "minimal" | "none"`
- Actual effective mappings from provider docs:
  - `xhigh` maps to `max`
  - `low` and `medium` map to `high`
  - `minimal` and `none` abandon/disable thinking

OpenCode config uses camelCase and converts it for the wire:

```json
"variants": {
  "thinking": {
    "thinking": { "type": "enabled" },
    "reasoningEffort": "max",
    "maxTokens": 65536,
    "temperature": 1
  },
  "thinking-high": {
    "thinking": { "type": "enabled" },
    "reasoningEffort": "high",
    "maxTokens": 32768,
    "temperature": 1
  },
  "no-thinking": {
    "thinking": { "type": "disabled" },
    "reasoningEffort": "none",
    "maxTokens": 8192,
    "temperature": 1
  }
}
```

Do not write `reasoning_effort` inside OpenCode variants; in observed OpenCode behavior it remains in resolved config but is not sent. Write `reasoningEffort`; OpenCode sends `reasoning_effort` to the provider.

OpenClaw uses a CLI abstraction instead of OpenCode variants:

```bash
openclaw infer model run --local --model bigmodel/glm-5.2 --thinking max --prompt '请只回复 OK' --json
```

OpenClaw accepted levels observed here:

```text
off, minimal, low, medium, high, adaptive, xhigh, max
```

Use `off` for OpenClaw's no-thinking mode; `none` is not accepted by the OpenClaw CLI even though it is a provider-level value.

## Verification Standard

Always separate these states:

- Config resolves: model appears in tool model list/status.
- Provider works: direct API call succeeds.
- Tool runtime works: OpenClaw/OpenCode can call the model and return content.
- Reasoning params are actually sent: if uncertain, use a temporary localhost proxy to inspect request bodies, then restore the official base URL.

For OpenCode thinking/reasoning verification, a localhost proxy should confirm request fields such as:

```json
{
  "model": "glm-5.2",
  "thinking": { "type": "enabled" },
  "reasoning_effort": "max"
}
```

After any temporary proxy test, restore the official `baseURL` and stop the proxy process.

## Reporting

Report in Chinese when the user is working in Chinese. Include:

- Files changed.
- Backup paths.
- Default model after the change.
- Exact commands or modes the user can use.
- Verification results, distinguishing direct provider success from OpenClaw/OpenCode success.
- Any naming differences between tools, especially when tool-level labels differ from provider-level API fields.
