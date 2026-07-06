#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

MAX_NAME_LEN = 64
SMALL_WORDS = {"and", "or", "to", "up", "with"}
ACRONYMS = {"GH", "MCP", "API", "CI", "CLI", "LLM", "PDF", "PR", "UI", "URL", "SQL", "DOCX", "PPTX", "XLSX"}
BRANDS = {
    "openai": "OpenAI",
    "openapi": "OpenAPI",
    "github": "GitHub",
    "pagerduty": "PagerDuty",
    "datadog": "DataDog",
    "sqlite": "SQLite",
    "fastapi": "FastAPI",
}
COPY_DIRS = ("scripts", "references", "assets", "examples")
COPY_FILES = ("LICENSE", "LICENSE.txt", "LICENSE.md", "NOTICE", "NOTICE.txt")
VENDOR_PATTERNS = {
    "qclaw": re.compile(r"\bQClaw\b|\bOpenClaw\b", re.IGNORECASE),
    "opencode": re.compile(r"\bOpenCode\b", re.IGNORECASE),
    "local-proxy": re.compile(r"/proxy/|AUTH_GATEWAY_PORT|localhost:\$PORT|localhost:19000"),
    "vendor-search": re.compile(r"ProSearch|天集", re.IGNORECASE),
    "hardcoded-tooling": re.compile(r"streamable_http|requires:\s*\n|bins:\s*\n", re.IGNORECASE),
}


@dataclass
class MigrationResult:
    source_name: str
    skill_name: str
    source_path: str
    dest_path: str
    warnings: list[str] = field(default_factory=list)
    copied_dirs: list[str] = field(default_factory=list)
    copied_files: list[str] = field(default_factory=list)


FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)
TOP_LEVEL_KEY_RE = re.compile(r"^([A-Za-z0-9_-]+):(?:\s*(.*))?$")
VALID_NAME_RE = re.compile(r"^[a-z0-9-]+$")


def normalize_name(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    if not value:
        value = "migrated-skill"
    return value[:MAX_NAME_LEN].rstrip("-") or "migrated-skill"


def unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def extract_frontmatter_value(frontmatter: str, key: str) -> str | None:
    lines = frontmatter.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.startswith(" ") or line.startswith("\t"):
            i += 1
            continue
        match = TOP_LEVEL_KEY_RE.match(line)
        if not match:
            i += 1
            continue
        current_key, raw_value = match.group(1), match.group(2) or ""
        if current_key != key:
            i += 1
            continue
        raw_value = raw_value.rstrip()
        if raw_value in {"|", ">", "|-", ">-", "|+", ">+"}:
            block: list[str] = []
            i += 1
            while i < len(lines):
                nxt = lines[i]
                if nxt and not nxt.startswith((" ", "\t")):
                    break
                if nxt.startswith("  "):
                    block.append(nxt[2:])
                elif nxt.startswith("\t"):
                    block.append(nxt[1:])
                else:
                    block.append(nxt)
                i += 1
            return "\n".join(block).strip()
        return unquote(raw_value)
    return None


def split_skill_file(content: str) -> tuple[str | None, str]:
    match = FRONTMATTER_RE.match(content)
    if not match:
        return None, content
    return match.group(1), content[match.end():]


def collapse_ws(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def yaml_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def yaml_block(value: str) -> str:
    lines = value.splitlines() or [""]
    return "description: |\n" + "\n".join(f"  {line}" for line in lines)


def format_display_name(skill_name: str) -> str:
    words = [word for word in skill_name.split("-") if word]
    formatted: list[str] = []
    for index, word in enumerate(words):
        lower = word.lower()
        upper = word.upper()
        if upper in ACRONYMS:
            formatted.append(upper)
            continue
        if lower in BRANDS:
            formatted.append(BRANDS[lower])
            continue
        if index > 0 and lower in SMALL_WORDS:
            formatted.append(lower)
            continue
        formatted.append(word.capitalize())
    return " ".join(formatted) or skill_name


def generate_short_description(display_name: str) -> str:
    candidates = [
        f"Help with {display_name} tasks",
        f"Help with {display_name} workflows",
        f"{display_name} helper",
        f"{display_name} tools",
    ]
    for candidate in candidates:
        if 25 <= len(candidate) <= 64:
            return candidate
    return (f"Help with {display_name}"[:64]).rstrip()


def detect_warnings(frontmatter: str | None, body: str, source_root_name: str) -> list[str]:
    warnings: list[str] = []
    combined = "\n".join(part for part in [frontmatter or "", body] if part)
    if frontmatter and re.search(r"^license:\s*", frontmatter, re.MULTILINE):
        warnings.append("source frontmatter included license; removed in migrated SKILL.md")
    if frontmatter and re.search(r"^metadata:\s*", frontmatter, re.MULTILINE):
        warnings.append("source frontmatter included metadata; removed in migrated SKILL.md")
    for label, pattern in VENDOR_PATTERNS.items():
        if pattern.search(combined):
            warnings.append(f"contains vendor-specific references: {label}")
    if "localhost" in combined:
        warnings.append("contains localhost assumptions; review before direct use")
    if source_root_name.lower().startswith("qclaw"):
        warnings.append("migrated from QClaw-style skill; verify tool commands before use")
    return sorted(set(warnings))


def basic_validate(skill_name: str, description: str, skill_md: Path) -> list[str]:
    problems: list[str] = []
    if not VALID_NAME_RE.match(skill_name):
        problems.append("invalid skill name after normalization")
    if len(skill_name) > MAX_NAME_LEN:
        problems.append("skill name exceeds 64 chars")
    if not description:
        problems.append("empty description")
    if len(description) > 1024:
        problems.append("description exceeds 1024 chars")
    if not skill_md.exists():
        problems.append("SKILL.md missing after write")
    return problems


def write_skill_md(dest: Path, skill_name: str, description: str, body: str) -> None:
    skill_md = dest / "SKILL.md"
    normalized_body = body.lstrip("\n")
    content = f"---\nname: {skill_name}\n{yaml_block(description)}\n---\n"
    if normalized_body:
        content += f"\n{normalized_body.rstrip()}\n"
    skill_md.write_text(content)


def write_openai_yaml(dest: Path, skill_name: str) -> None:
    display_name = format_display_name(skill_name)
    short_description = generate_short_description(display_name)
    default_prompt = f"Use ${skill_name} to help with this task."
    agents_dir = dest / "agents"
    agents_dir.mkdir(parents=True, exist_ok=True)
    lines = [
        "interface:",
        f"  display_name: {yaml_quote(display_name)}",
        f"  short_description: {yaml_quote(short_description)}",
        f"  default_prompt: {yaml_quote(default_prompt)}",
    ]
    (agents_dir / "openai.yaml").write_text("\n".join(lines) + "\n")


def copy_resources(src: Path, dest: Path) -> tuple[list[str], list[str]]:
    copied_dirs: list[str] = []
    copied_files: list[str] = []
    for dirname in COPY_DIRS:
        source_dir = src / dirname
        if source_dir.exists() and source_dir.is_dir():
            shutil.copytree(source_dir, dest / dirname, dirs_exist_ok=True)
            copied_dirs.append(dirname)
    for filename in COPY_FILES:
        source_file = src / filename
        if source_file.exists() and source_file.is_file():
            shutil.copy2(source_file, dest / filename)
            copied_files.append(filename)
    return copied_dirs, copied_files


def migrate_skill(source_skill_dir: Path, output_root: Path, source_label: str) -> MigrationResult:
    raw_content = (source_skill_dir / "SKILL.md").read_text()
    frontmatter, body = split_skill_file(raw_content)
    parsed_name = extract_frontmatter_value(frontmatter, "name") if frontmatter else None
    parsed_description = extract_frontmatter_value(frontmatter, "description") if frontmatter else None

    skill_name = normalize_name(parsed_name or source_skill_dir.name)
    description = collapse_ws(parsed_description or f"Migrated skill from {source_label}: {skill_name}.")
    if not description:
        description = f"Migrated skill from {source_label}: {skill_name}."

    dest = output_root / skill_name
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)

    write_skill_md(dest, skill_name, description, body)
    write_openai_yaml(dest, skill_name)
    copied_dirs, copied_files = copy_resources(source_skill_dir, dest)

    warnings = detect_warnings(frontmatter, body, source_label)
    warnings.extend(basic_validate(skill_name, description, dest / "SKILL.md"))

    return MigrationResult(
        source_name=source_skill_dir.name,
        skill_name=skill_name,
        source_path=str(source_skill_dir),
        dest_path=str(dest),
        warnings=sorted(set(warnings)),
        copied_dirs=copied_dirs,
        copied_files=copied_files,
    )


def iter_skill_dirs(source_root: Path) -> Iterable[Path]:
    for child in sorted(source_root.iterdir()):
        if child.is_dir() and (child / "SKILL.md").exists():
            yield child


def write_report(output_root: Path, source_label: str, results: list[MigrationResult]) -> None:
    report_path = output_root / "MIGRATION_REPORT.md"
    manifest_path = output_root / "migration-manifest.json"

    lines = [
        f"# {source_label} skill migration report",
        "",
        f"- Total migrated skills: **{len(results)}**",
        f"- Output root: `{output_root}`",
        "- These skills are normalized to Codex-style `SKILL.md` + `agents/openai.yaml`.",
        "- They are not auto-registered in the current session; copy a skill folder to your discovered skills directory when you want to install it globally.",
        "",
        "## Skills",
        "",
    ]

    for item in results:
        lines.append(f"### {item.skill_name}")
        lines.append(f"- Source: `{item.source_path}`")
        lines.append(f"- Destination: `{item.dest_path}`")
        if item.copied_dirs:
            lines.append(f"- Copied dirs: {', '.join(f'`{d}`' for d in item.copied_dirs)}")
        if item.copied_files:
            lines.append(f"- Copied files: {', '.join(f'`{f}`' for f in item.copied_files)}")
        if item.warnings:
            lines.append("- Warnings:")
            for warning in item.warnings:
                lines.append(f"  - {warning}")
        else:
            lines.append("- Warnings: none")
        lines.append("")

    report_path.write_text("\n".join(lines).rstrip() + "\n")
    manifest_path.write_text(json.dumps([item.__dict__ for item in results], ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate external skill folders into Codex-style skills.")
    parser.add_argument("--source", required=True, help="Source root containing skill subdirectories")
    parser.add_argument("--output", required=True, help="Output root for migrated skill folders")
    parser.add_argument("--label", required=True, help="Source label used in reports")
    parser.add_argument("--include", nargs="*", default=[], help="Optional subset of skill folder names to migrate")
    args = parser.parse_args()

    source_root = Path(args.source).expanduser().resolve()
    output_root = Path(args.output).expanduser().resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    include = set(args.include or [])
    results: list[MigrationResult] = []
    for source_skill_dir in iter_skill_dirs(source_root):
        if include and source_skill_dir.name not in include:
            continue
        results.append(migrate_skill(source_skill_dir, output_root, args.label))

    write_report(output_root, args.label, results)
    print(f"Migrated {len(results)} skills from {source_root} to {output_root}")


if __name__ == "__main__":
    main()
