import type { ComponentDoc } from "./types.ts";

function esc(value: string): string {
  return value.replaceAll("|", "\\|");
}

function escHtml(value: string): string {
  return value.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function generateMarkdown(doc: ComponentDoc): string {
  const sections: string[] = [`# ${doc.name}`];

  if (doc.description) {
    sections.push("", doc.description);
  }

  const hasProps = doc.props.length > 0;
  const hasEmits = doc.emits.length > 0;
  const hasSlots = (doc.slots?.length ?? 0) > 0;
  const hasExposes = (doc.exposes?.length ?? 0) > 0;
  const hasComposables = (doc.composables?.length ?? 0) > 0;

  if (!hasProps && !hasEmits && !hasSlots && !hasExposes && !hasComposables) {
    sections.push("", "No documentable API found.");
    return sections.join("\n") + "\n";
  }

  // Props
  if (hasProps) {
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
            ? ` **Deprecated**: ${p.deprecated}`
            : " **Deprecated**";
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

  // Emits
  if (hasEmits) {
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

  // Slots
  if (hasSlots) {
    sections.push("", "## Slots", "");
    sections.push("| Name | Bindings | Description |");
    sections.push("| --- | --- | --- |");
    for (const s of doc.slots!) {
      const desc = s.description || "-";
      const bindings = s.bindings.length > 0 ? s.bindings.join(", ") : "-";
      sections.push(`| ${esc(s.name)} | ${esc(bindings)} | ${esc(desc)} |`);
    }
  }

  // Exposed
  if (hasExposes) {
    sections.push("", "## Exposed", "");
    sections.push("| Name | Type | Description |");
    sections.push("| --- | --- | --- |");
    for (const e of doc.exposes!) {
      const desc = e.description || "-";
      sections.push(`| ${esc(e.name)} | ${esc(e.type)} | ${esc(desc)} |`);
    }
  }

  // Composables
  if (hasComposables) {
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

  return sections.join("\n") + "\n";
}
