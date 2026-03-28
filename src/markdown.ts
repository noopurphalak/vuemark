import type { ComponentDoc, SectionKey } from "./types.ts";
import { DEFAULT_SECTION_ORDER } from "./types.ts";

function esc(value: string): string {
  return value.replaceAll("|", "\\|");
}

function escHtml(value: string): string {
  return value.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export interface MarkdownOptions {
  sectionOrder?: SectionKey[];
}

// --- Section renderers ---

function renderRefs(doc: ComponentDoc, sections: string[]): void {
  if ((doc.refs?.length ?? 0) === 0) return;

  sections.push("", "## Refs", "");
  sections.push("| Name | Type | Description |");
  sections.push("| --- | --- | --- |");

  const examples: Array<{ name: string; example: string }> = [];

  for (const r of doc.refs!) {
    let desc = r.description || "-";

    if (r.deprecated) {
      desc +=
        typeof r.deprecated === "string" && r.deprecated
          ? ` **⚠️ Deprecated**: ${r.deprecated}`
          : " **⚠️ Deprecated**";
    }
    if (r.since) {
      desc += ` *(since ${r.since})*`;
    }
    if (r.see) {
      desc += ` See: ${r.see}`;
    }

    sections.push(`| ${esc(r.name)} | ${escHtml(esc(r.type))} | ${esc(desc)} |`);

    if (r.example) {
      examples.push({ name: r.name, example: r.example });
    }
  }

  for (const { name, example } of examples) {
    sections.push("", `**\`${name}\` example:**`, "", "```", example, "```");
  }
}

function renderComputed(doc: ComponentDoc, sections: string[]): void {
  if ((doc.computeds?.length ?? 0) === 0) return;

  sections.push("", "## Computed", "");
  sections.push("| Name | Type | Description |");
  sections.push("| --- | --- | --- |");

  const examples: Array<{ name: string; example: string }> = [];

  for (const c of doc.computeds!) {
    let desc = c.description || "-";

    if (c.deprecated) {
      desc +=
        typeof c.deprecated === "string" && c.deprecated
          ? ` **⚠️ Deprecated**: ${c.deprecated}`
          : " **⚠️ Deprecated**";
    }
    if (c.since) {
      desc += ` *(since ${c.since})*`;
    }
    if (c.see) {
      desc += ` See: ${c.see}`;
    }

    sections.push(`| ${esc(c.name)} | ${escHtml(esc(c.type))} | ${esc(desc)} |`);

    if (c.example) {
      examples.push({ name: c.name, example: c.example });
    }
  }

  for (const { name, example } of examples) {
    sections.push("", `**\`${name}\` example:**`, "", "```", example, "```");
  }
}

function renderProps(doc: ComponentDoc, sections: string[]): void {
  if (doc.props.length === 0) return;

  sections.push("", "## Props", "");
  sections.push("| Name | Type | Required | Default | Description |");
  sections.push("| --- | --- | --- | --- | --- |");

  const examples: Array<{ name: string; example: string }> = [];

  for (const p of doc.props) {
    const def = p.default !== undefined ? `\`${p.default}\`` : "-";
    let desc = p.description || "-";

    if (p.deprecated) {
      desc +=
        typeof p.deprecated === "string" && p.deprecated
          ? ` **⚠️ Deprecated**: ${p.deprecated}`
          : " **⚠️ Deprecated**";
    }
    if (p.since) {
      desc += ` *(since ${p.since})*`;
    }
    if (p.see) {
      desc += ` See: ${p.see}`;
    }

    const req = p.required ? "Yes" : "No";
    sections.push(`| ${esc(p.name)} | ${esc(p.type)} | ${req} | ${esc(def)} | ${esc(desc)} |`);

    if (p.example) {
      examples.push({ name: p.name, example: p.example });
    }
  }

  for (const { name, example } of examples) {
    sections.push("", `**\`${name}\` example:**`, "", "```", example, "```");
  }
}

function renderEmits(doc: ComponentDoc, sections: string[]): void {
  if (doc.emits.length === 0) return;

  const hasPayload = doc.emits.some((e) => e.payload);

  if (hasPayload) {
    sections.push("", "## Emits", "");
    sections.push("| Name | Payload | Description |");
    sections.push("| --- | --- | --- |");
    for (const e of doc.emits) {
      const desc = e.description || "-";
      const payload = e.payload || "-";
      sections.push(`| ${esc(e.name)} | ${esc(payload)} | ${esc(desc)} |`);
    }
  } else {
    sections.push("", "## Emits", "");
    sections.push("| Name | Description |");
    sections.push("| --- | --- |");
    for (const e of doc.emits) {
      const desc = e.description || "-";
      sections.push(`| ${esc(e.name)} | ${esc(desc)} |`);
    }
  }
}

function renderSlots(doc: ComponentDoc, sections: string[]): void {
  if ((doc.slots?.length ?? 0) === 0) return;

  sections.push("", "## Slots", "");
  sections.push("| Name | Bindings | Description |");
  sections.push("| --- | --- | --- |");
  for (const s of doc.slots!) {
    const desc = s.description || "-";
    const bindings = s.bindings.length > 0 ? s.bindings.join(", ") : "-";
    sections.push(`| ${esc(s.name)} | ${esc(bindings)} | ${esc(desc)} |`);
  }
}

function renderExposed(doc: ComponentDoc, sections: string[]): void {
  if ((doc.exposes?.length ?? 0) === 0) return;

  sections.push("", "## Exposed", "");
  sections.push("| Name | Type | Description |");
  sections.push("| --- | --- | --- |");
  for (const e of doc.exposes!) {
    const desc = e.description || "-";
    sections.push(`| ${esc(e.name)} | ${esc(e.type)} | ${esc(desc)} |`);
  }
}

function renderComposables(doc: ComponentDoc, sections: string[]): void {
  if ((doc.composables?.length ?? 0) === 0) return;

  sections.push("", "## Composables Used");

  for (const c of doc.composables!) {
    sections.push("", `### \`${c.name}\``);

    // Source line for local imports
    if (c.source && (c.source.startsWith(".") || c.source.startsWith("@/"))) {
      sections.push("", `*Source: \`${c.source}\`*`);
    }

    if (c.variables.length === 0) {
      // Bare call
      sections.push("", "Called for side effects.");
    } else {
      const hasTypes = c.variables.some((v) => v.type);
      if (!hasTypes && c.variables.length <= 3) {
        // Simple returns line
        const vars = c.variables.map((v) => `\`${v.name}\``).join(", ");
        sections.push("", `**Returns:** ${vars}`);
      } else {
        // Full table
        sections.push("");
        sections.push("| Variable | Type |");
        sections.push("| --- | --- |");
        for (const v of c.variables) {
          const type = v.type ? escHtml(esc(v.type)) : "-";
          sections.push(`| ${esc(v.name)} | ${type} |`);
        }
      }
    }
  }
}

const sectionRenderers: Record<SectionKey, (doc: ComponentDoc, sections: string[]) => void> = {
  refs: renderRefs,
  computed: renderComputed,
  props: renderProps,
  emits: renderEmits,
  slots: renderSlots,
  exposed: renderExposed,
  composables: renderComposables,
};

function hasAnySections(doc: ComponentDoc, sectionOrder?: SectionKey[]): boolean {
  const keys = sectionOrder ?? DEFAULT_SECTION_ORDER;
  return keys.some((key) => {
    switch (key) {
      case "props": return doc.props.length > 0;
      case "emits": return doc.emits.length > 0;
      case "slots": return (doc.slots?.length ?? 0) > 0;
      case "exposed": return (doc.exposes?.length ?? 0) > 0;
      case "composables": return (doc.composables?.length ?? 0) > 0;
      case "refs": return (doc.refs?.length ?? 0) > 0;
      case "computed": return (doc.computeds?.length ?? 0) > 0;
      default: return false;
    }
  });
}

export function generateMarkdown(doc: ComponentDoc, options?: MarkdownOptions): string {
  let heading = `# ${doc.name}`;
  if (doc.deprecated) {
    heading += " ⚠️ Deprecated";
  }
  const sections: string[] = [heading];

  if (doc.deprecated) {
    const reason =
      typeof doc.deprecated === "string" && doc.deprecated
        ? `> **⚠️ Deprecated**: ${doc.deprecated}`
        : "> **⚠️ Deprecated**";
    sections.push("", reason);
  }

  if (doc.description) {
    sections.push("", doc.description);
  }

  if (doc.version) {
    sections.push("", `**Version:** ${doc.version}`);
  }

  if (doc.scriptSetup) {
    sections.push("", "**Note:** Uses `<script setup>` syntax.");
  }

  const rawOrder = options?.sectionOrder ?? DEFAULT_SECTION_ORDER;
  const order = rawOrder.filter((key) => {
    if (!sectionRenderers[key]) {
      console.warn(
        `compmark: unknown sectionOrder key "${key}" — valid keys are: ${DEFAULT_SECTION_ORDER.join(", ")}`,
      );
      return false;
    }
    return true;
  });

  if (!hasAnySections(doc, order)) {
    sections.push("", "No documentable API found.");
    return sections.join("\n") + "\n";
  }

  for (const key of order) {
    const renderer = sectionRenderers[key];
    if (renderer) {
      renderer(doc, sections);
    }
  }

  return sections.join("\n") + "\n";
}

export function adjustHeadingLevel(md: string, increment: number): string {
  return md.replace(/^(#{1,6})\s/gm, (_, hashes: string) => {
    const newLevel = Math.min(hashes.length + increment, 6);
    return "#".repeat(newLevel) + " ";
  });
}
