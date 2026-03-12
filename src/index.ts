import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSFC } from "./parser.ts";

export type {
  ComponentDoc,
  PropDoc,
  EmitDoc,
  SlotDoc,
  ExposeDoc,
  ComposableDoc,
  ComposableVariable,
} from "./types.ts";
export { parseSFC } from "./parser.ts";
export { generateMarkdown } from "./markdown.ts";

export function parseComponent(filePath: string) {
  const abs = resolve(filePath);
  const source = readFileSync(abs, "utf-8");
  const filename = abs.split("/").pop() ?? "Unknown.vue";
  const sfcDir = abs.substring(0, abs.lastIndexOf("/"));
  return parseSFC(source, filename, sfcDir);
}
