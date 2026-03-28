import { existsSync, readFileSync } from "node:fs";
import { parse, compileScript } from "@vue/compiler-sfc";
import type {
  Statement,
  Expression,
  ObjectProperty,
  TSTypeParameterInstantiation,
} from "@babel/types";
import type {
  ComponentDoc,
  PropDoc,
  EmitDoc,
  SlotDoc,
  ExposeDoc,
  ComposableDoc,
  ComposableVariable,
  RefDoc,
  ComputedDoc,
} from "./types.ts";
import { resolveImportPath, resolveComposableTypes } from "./resolver.ts";
import { resolveImportedPropsType } from "./type-resolver.ts";

// --- JSDoc parsing ---

interface JSDocResult {
  description: string;
  deprecated?: string | boolean;
  since?: string;
  example?: string;
  see?: string;
  defaultOverride?: string;
  internal?: boolean;
  category?: string;
  version?: string;
}

function parseJSDocTags(comments: Array<{ type: string; value: string }>): JSDocResult {
  const result: JSDocResult = { description: "" };
  const descLines: string[] = [];

  for (let i = comments.length - 1; i >= 0; i--) {
    const c = comments[i]!;
    if (c.type !== "CommentBlock") continue;

    const lines = c.value
      .split("\n")
      .map((l) => l.replace(/^\s*\*\s?/, "").trim())
      .filter((l) => l && !l.startsWith("/"));

    for (const line of lines) {
      if (line.startsWith("@deprecated")) {
        const reason = line.replace(/^@deprecated\s*/, "").trim();
        result.deprecated = reason || true;
      } else if (line.startsWith("@since")) {
        result.since = line.replace(/^@since\s*/, "").trim();
      } else if (line.startsWith("@example")) {
        result.example = line.replace(/^@example\s*/, "").trim();
      } else if (line.startsWith("@see")) {
        result.see = line.replace(/^@see\s*/, "").trim();
      } else if (line.startsWith("@default")) {
        result.defaultOverride = line.replace(/^@default\s*/, "").trim();
      } else if (line.startsWith("@internal")) {
        result.internal = true;
      } else if (line.startsWith("@category")) {
        result.category = line.replace(/^@category\s*/, "").trim();
      } else if (line.startsWith("@version")) {
        result.version = line.replace(/^@version\s*/, "").trim();
      } else if (!line.startsWith("@")) {
        descLines.push(line);
      }
    }

    break; // only process last comment block
  }

  result.description = descLines.join(" ");
  return result;
}

// --- Main entry ---

export function parseSFC(source: string, filename: string, sfcDir?: string): ComponentDoc {
  const name =
    filename
      .replace(/\.vue$/, "")
      .split("/")
      .pop() ?? "Unknown";
  const doc: ComponentDoc = { name, props: [], emits: [] };

  const fullPath = sfcDir ? `${sfcDir}/${filename}` : filename;
  const { descriptor } = parse(source, { filename: fullPath });

  doc.scriptSetup = !!descriptor.scriptSetup;

  // Extract template slots early (before early return) so template-only components get slots
  if (descriptor.template?.ast) {
    const templateSlots = extractTemplateSlots(descriptor.template.ast);
    if (templateSlots.length > 0) {
      doc.slots = templateSlots;
    }
  }

  if (!descriptor.scriptSetup && !descriptor.script) {
    return doc;
  }

  let compiled;
  try {
    compiled = compileScript(descriptor, {
      id: fullPath,
      fs: {
        fileExists: (file: string) => existsSync(file),
        readFile: (file: string) => {
          try {
            return readFileSync(file, "utf-8");
          } catch {
            return undefined;
          }
        },
      },
    });
  } catch {
    // compileScript may fail when resolving imported types (e.g. no sfcDir).
    // Return doc as-is with empty props/emits.
    return doc;
  }

  // Component-level JSDoc
  const componentJSDoc = extractComponentJSDoc(compiled.scriptSetupAst ?? compiled.scriptAst ?? []);
  doc.description = componentJSDoc.description;
  doc.internal = componentJSDoc.internal;
  if (componentJSDoc.category) doc.category = componentJSDoc.category;
  if (componentJSDoc.version) doc.version = componentJSDoc.version;
  if (componentJSDoc.deprecated !== undefined) doc.deprecated = componentJSDoc.deprecated;

  // Process <script setup>
  const setupAst = compiled.scriptSetupAst;
  if (setupAst) {
    const scriptSource = descriptor.scriptSetup?.content ?? compiled.content;
    const importMap = buildImportMap(setupAst);

    for (const stmt of setupAst) {
      const calls = extractDefineCalls(stmt);
      for (const { callee, args, leadingComments, typeParams, defaultsArg } of calls) {
        if (callee === "defineProps" && args[0]?.type === "ObjectExpression") {
          doc.props = extractProps(args[0], scriptSource);
        } else if (callee === "defineProps" && typeParams?.params[0]?.type === "TSTypeLiteral") {
          doc.props = extractTypeProps(typeParams.params[0], defaultsArg, scriptSource);
        } else if (callee === "defineProps" && typeParams?.params[0]?.type === "TSTypeReference") {
          const typeName = (typeParams.params[0] as any).typeName?.name as string | undefined;
          if (typeName && sfcDir) {
            const resolved = resolveImportedPropsType(typeName, importMap, sfcDir);
            if (resolved) {
              doc.props = extractTypeProps(resolved, defaultsArg, scriptSource);
            }
          }
        } else if (callee === "defineEmits" && args[0]?.type === "ArrayExpression") {
          doc.emits = extractEmits(args[0], leadingComments);
        } else if (callee === "defineEmits" && typeParams?.params[0]?.type === "TSTypeLiteral") {
          doc.emits = extractTypeEmits(typeParams.params[0]);
        } else if (callee === "defineSlots" && typeParams?.params[0]?.type === "TSTypeLiteral") {
          doc.slots = extractTypeSlots(typeParams.params[0]);
        } else if (callee === "defineExpose" && args[0]?.type === "ObjectExpression") {
          doc.exposes = extractExposes(args[0], scriptSource);
        }
      }
    }

    // Composable detection (importMap already built above)
    doc.composables = extractComposables(setupAst, importMap, sfcDir);

    // Ref and computed extraction
    const { refs, computeds } = extractRefsAndComputeds(setupAst, scriptSource);
    if (refs.length > 0) doc.refs = refs;
    if (computeds.length > 0) doc.computeds = computeds;
  }

  // Options API fallback
  const scriptAst = compiled.scriptAst;
  if (scriptAst && doc.props.length === 0 && doc.emits.length === 0) {
    const optionsDoc = extractOptionsAPI(scriptAst, compiled.content);
    doc.props = optionsDoc.props;
    doc.emits = optionsDoc.emits;
    if (optionsDoc.refs.length > 0) doc.refs = optionsDoc.refs;
    if (optionsDoc.computeds.length > 0) doc.computeds = optionsDoc.computeds;
  }

  return doc;
}

// --- Component-level JSDoc ---

interface ComponentJSDocResult {
  description: string;
  internal: boolean;
  category?: string;
  version?: string;
  deprecated?: string | boolean;
}

function extractComponentJSDoc(ast: Statement[]): ComponentJSDocResult {
  const empty: ComponentJSDocResult = { description: "", internal: false };
  if (ast.length === 0) return empty;

  const first = ast[0]!;
  const comments = (first.leadingComments ?? []) as Array<{ type: string; value: string }>;

  if (comments.length === 0) return empty;

  const firstComment = comments[0]!;
  if (firstComment.type !== "CommentBlock") return empty;

  const result = parseJSDocTags([firstComment]);

  // Always extract @internal
  if (result.internal) {
    return {
      description: result.description,
      internal: true,
      category: result.category,
      version: result.version,
      deprecated: result.deprecated,
    };
  }

  // Treat the first comment as component-level if:
  // 1. It has a @component tag (explicit)
  // 2. The first statement is an import (comment is clearly component-level)
  // 3. The first statement is a define call (prop/emit docs live inside the type, not on the statement)
  // Skip when the first statement is a variable declaration (comment likely describes the variable)
  const isImport = first.type === "ImportDeclaration";
  const isDefineCall =
    first.type === "ExpressionStatement" &&
    first.expression.type === "CallExpression" &&
    first.expression.callee.type === "Identifier" &&
    first.expression.callee.name.startsWith("define");
  const isDefineVar =
    first.type === "VariableDeclaration" &&
    first.declarations.some(
      (d: any) =>
        d.init?.type === "CallExpression" &&
        d.init.callee?.type === "Identifier" &&
        (d.init.callee.name.startsWith("define") || d.init.callee.name === "withDefaults"),
    );
  const hasComponentTag = firstComment.value.includes("@component");

  if (hasComponentTag || isImport || isDefineCall || isDefineVar) {
    return {
      description: result.description,
      internal: false,
      category: result.category,
      version: result.version,
      deprecated: result.deprecated,
    };
  }

  return empty;
}

// --- Define call extraction ---

interface DefineCall {
  callee: string;
  args: Expression[];
  leadingComments: Array<{ type: string; value: string }>;
  typeParams?: TSTypeParameterInstantiation;
  defaultsArg?: Expression;
}

function processCallExpression(
  callExpr: Extract<Expression, { type: "CallExpression" }>,
  leadingComments: Array<{ type: string; value: string }>,
): DefineCall {
  // Handle withDefaults(defineProps<T>(), {...})
  if (
    callExpr.callee.type === "Identifier" &&
    callExpr.callee.name === "withDefaults" &&
    callExpr.arguments[0]?.type === "CallExpression" &&
    callExpr.arguments[0].callee.type === "Identifier" &&
    callExpr.arguments[0].callee.name === "defineProps"
  ) {
    const innerCall = callExpr.arguments[0];
    return {
      callee: "defineProps",
      args: innerCall.arguments as Expression[],
      leadingComments,
      typeParams: innerCall.typeParameters as TSTypeParameterInstantiation | undefined,
      defaultsArg: callExpr.arguments[1] as Expression | undefined,
    };
  }

  return {
    callee: callExpr.callee.type === "Identifier" ? callExpr.callee.name : "",
    args: callExpr.arguments as Expression[],
    leadingComments,
    typeParams: callExpr.typeParameters as TSTypeParameterInstantiation | undefined,
  };
}

function extractDefineCalls(stmt: Statement): DefineCall[] {
  const calls: DefineCall[] = [];
  const comments = (stmt.leadingComments ?? []) as Array<{ type: string; value: string }>;

  if (
    stmt.type === "ExpressionStatement" &&
    stmt.expression.type === "CallExpression" &&
    stmt.expression.callee.type === "Identifier"
  ) {
    calls.push(processCallExpression(stmt.expression, comments));
  }

  if (stmt.type === "VariableDeclaration") {
    for (const decl of stmt.declarations) {
      if (decl.init?.type === "CallExpression" && decl.init.callee.type === "Identifier") {
        calls.push(processCallExpression(decl.init, comments));
      }
    }
  }

  return calls;
}

// --- Props extraction ---

function extractTypeProps(
  typeLiteral: { members: Array<any> },
  defaultsArg: Expression | undefined,
  source: string,
): PropDoc[] {
  const defaults =
    defaultsArg?.type === "ObjectExpression"
      ? extractDefaultsMap(defaultsArg, source)
      : new Map<string, string>();

  const props: PropDoc[] = [];

  for (const member of typeLiteral.members) {
    if (member.type !== "TSPropertySignature") continue;

    const name =
      member.key.type === "Identifier"
        ? member.key.name
        : member.key.type === "StringLiteral"
          ? member.key.value
          : "";
    if (!name) continue;

    const type = member.typeAnnotation?.typeAnnotation
      ? resolveTypeString(member.typeAnnotation.typeAnnotation)
      : "unknown";

    const jsdoc = parseJSDocTags(
      (member.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    props.push({
      name,
      type,
      required: !member.optional,
      default: defaults.get(name),
      description: jsdoc.description,
      ...(jsdoc.deprecated !== undefined && { deprecated: jsdoc.deprecated }),
      ...(jsdoc.since && { since: jsdoc.since }),
      ...(jsdoc.example && { example: jsdoc.example }),
      ...(jsdoc.see && { see: jsdoc.see }),
    });
  }

  return props;
}

function resolveTypeString(node: any): string {
  switch (node.type) {
    case "TSStringKeyword":
      return "string";
    case "TSNumberKeyword":
      return "number";
    case "TSBooleanKeyword":
      return "boolean";
    case "TSObjectKeyword":
      return "object";
    case "TSAnyKeyword":
      return "any";
    case "TSVoidKeyword":
      return "void";
    case "TSNullKeyword":
      return "null";
    case "TSUndefinedKeyword":
      return "undefined";
    case "TSUnionType":
      return node.types.map((t: any) => resolveTypeString(t)).join(" | ");
    case "TSIntersectionType":
      return node.types.map((t: any) => resolveTypeString(t)).join(" & ");
    case "TSLiteralType":
      if (node.literal.type === "StringLiteral") return `'${node.literal.value}'`;
      if (node.literal.type === "NumericLiteral") return String(node.literal.value);
      if (node.literal.type === "BooleanLiteral") return String(node.literal.value);
      return "unknown";
    case "TSArrayType":
      return `${resolveTypeString(node.elementType)}[]`;
    case "TSTypeReference": {
      const name = node.typeName?.type === "Identifier" ? node.typeName.name : "unknown";
      if (node.typeParameters?.params?.length) {
        const params = node.typeParameters.params.map((p: any) => resolveTypeString(p)).join(", ");
        return `${name}<${params}>`;
      }
      return name;
    }
    case "TSFunctionType":
      return "Function";
    case "TSTupleType":
      return `[${node.elementTypes.map((t: any) => resolveTypeString(t)).join(", ")}]`;
    case "TSNamedTupleMember":
      return resolveTypeString(node.elementType);
    case "TSParenthesizedType":
      return resolveTypeString(node.typeAnnotation);
    default:
      return "unknown";
  }
}

function extractDefaultsMap(
  obj: Extract<Expression, { type: "ObjectExpression" }>,
  source: string,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const prop of obj.properties) {
    if (prop.type !== "ObjectProperty") continue;
    const name =
      prop.key.type === "Identifier"
        ? prop.key.name
        : prop.key.type === "StringLiteral"
          ? prop.key.value
          : "";
    if (!name) continue;
    map.set(name, stringifyDefault(prop.value as Expression, source));
  }

  return map;
}

function extractProps(
  obj: Extract<Expression, { type: "ObjectExpression" }>,
  source: string,
): PropDoc[] {
  const props: PropDoc[] = [];

  for (const prop of obj.properties) {
    if (prop.type !== "ObjectProperty") continue;

    const p = prop as ObjectProperty;
    const name =
      p.key.type === "Identifier" ? p.key.name : p.key.type === "StringLiteral" ? p.key.value : "";

    if (!name) continue;

    const jsdoc = parseJSDocTags(
      (p.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    const tagFields = {
      ...(jsdoc.deprecated !== undefined && { deprecated: jsdoc.deprecated }),
      ...(jsdoc.since && { since: jsdoc.since }),
      ...(jsdoc.example && { example: jsdoc.example }),
      ...(jsdoc.see && { see: jsdoc.see }),
    };

    if (p.value.type === "Identifier") {
      // Shorthand: { name: String }
      props.push({
        name,
        type: p.value.name,
        required: false,
        default: undefined,
        description: jsdoc.description,
        ...tagFields,
      });
    } else if (p.value.type === "ArrayExpression") {
      // Array type: { name: [String, Number] }
      const types = p.value.elements
        .filter((el) => el?.type === "Identifier")
        .map((el) => (el as Extract<Expression, { type: "Identifier" }>).name);
      props.push({
        name,
        type: types.join(" | "),
        required: false,
        default: undefined,
        description: jsdoc.description,
        ...tagFields,
      });
    } else if (p.value.type === "ObjectExpression") {
      // Full syntax: { name: { type: X, required: Y, default: Z } }
      let type = "unknown";
      let required = false;
      let defaultVal: string | undefined;

      for (const field of p.value.properties) {
        if (field.type !== "ObjectProperty") continue;
        const fieldName = field.key.type === "Identifier" ? field.key.name : "";

        if (fieldName === "type") {
          if (field.value.type === "Identifier") {
            type = field.value.name;
          } else if (field.value.type === "ArrayExpression") {
            type = field.value.elements
              .filter((el) => el?.type === "Identifier")
              .map((el) => (el as Extract<Expression, { type: "Identifier" }>).name)
              .join(" | ");
          }
        } else if (fieldName === "required") {
          required = field.value.type === "BooleanLiteral" && field.value.value;
        } else if (fieldName === "default") {
          defaultVal = stringifyDefault(field.value as Expression, source);
        }
      }

      props.push({
        name,
        type,
        required,
        default: defaultVal,
        description: jsdoc.description,
        ...tagFields,
      });
    }
  }

  return props;
}

// --- Emits extraction ---

function extractEmits(
  arr: Extract<Expression, { type: "ArrayExpression" }>,
  leadingComments: Array<{ type: string; value: string }>,
): EmitDoc[] {
  const emits: EmitDoc[] = [];
  const jsdocMap = parseEmitJSDoc(leadingComments);

  for (const el of arr.elements) {
    if (el?.type === "StringLiteral") {
      emits.push({
        name: el.value,
        description: jsdocMap.get(el.value) ?? "",
      });
    }
  }

  return emits;
}

function parseEmitJSDoc(comments: Array<{ type: string; value: string }>): Map<string, string> {
  const map = new Map<string, string>();

  for (const c of comments) {
    if (c.type !== "CommentBlock") continue;

    const lines = c.value.split("\n").map((l) =>
      l
        .replace(/^\s*\*\s?/, "")
        .replace(/^\s*\/?\*+\s?/, "")
        .trim(),
    );

    for (const line of lines) {
      const match = line.match(/^@emit\s+(\S+)\s+(.*)/);
      if (match?.[1] && match[2]) {
        map.set(match[1], match[2].trim());
      }
    }
  }

  return map;
}

// --- TS Generic Emits ---

function extractTypeEmits(typeLiteral: { members: Array<any> }): EmitDoc[] {
  const emits: EmitDoc[] = [];

  for (const member of typeLiteral.members) {
    if (member.type === "TSPropertySignature") {
      const name =
        member.key.type === "Identifier"
          ? member.key.name
          : member.key.type === "StringLiteral"
            ? member.key.value
            : "";
      if (!name) continue;

      const jsdoc = parseJSDocTags(
        (member.leadingComments ?? []) as Array<{ type: string; value: string }>,
      );

      let payload: string | undefined;
      // typeAnnotation -> TSTupleType elements
      const typeAnnotation = member.typeAnnotation?.typeAnnotation;
      if (typeAnnotation?.type === "TSTupleType") {
        payload = typeAnnotation.elementTypes
          .map((el: any) => {
            if (el.type === "TSNamedTupleMember") {
              const label = el.label?.name ?? "arg";
              return `${label}: ${resolveTypeString(el.elementType)}`;
            }
            return resolveTypeString(el);
          })
          .join(", ");
      }

      emits.push({
        name,
        description: jsdoc.description,
        ...(payload && { payload }),
      });
    } else if (member.type === "TSCallSignatureDeclaration") {
      // defineEmits<{ (e: 'click', payload: MouseEvent): void }>()
      const params = member.parameters ?? [];
      if (params.length === 0) continue;

      // First param is the event name
      const firstParam = params[0];
      if (
        firstParam?.typeAnnotation?.typeAnnotation?.type !== "TSLiteralType" ||
        firstParam.typeAnnotation.typeAnnotation.literal.type !== "StringLiteral"
      ) {
        continue;
      }

      const name = firstParam.typeAnnotation.typeAnnotation.literal.value;

      const jsdoc = parseJSDocTags(
        (member.leadingComments ?? []) as Array<{ type: string; value: string }>,
      );

      // Remaining params are the payload
      const payloadParams = params.slice(1);
      let payload: string | undefined;
      if (payloadParams.length > 0) {
        payload = payloadParams
          .map((p: any) => {
            const paramName = p.type === "Identifier" ? p.name : "arg";
            const paramType = p.typeAnnotation?.typeAnnotation
              ? resolveTypeString(p.typeAnnotation.typeAnnotation)
              : "unknown";
            return `${paramName}: ${paramType}`;
          })
          .join(", ");
      }

      emits.push({
        name,
        description: jsdoc.description,
        ...(payload && { payload }),
      });
    }
  }

  return emits;
}

// --- Slots extraction ---

function extractTypeSlots(typeLiteral: { members: Array<any> }): SlotDoc[] {
  const slots: SlotDoc[] = [];

  for (const member of typeLiteral.members) {
    // defineSlots uses TSMethodSignature or TSPropertySignature
    const name =
      member.key?.type === "Identifier"
        ? member.key.name
        : member.key?.type === "StringLiteral"
          ? member.key.value
          : "";
    if (!name) continue;

    const jsdoc = parseJSDocTags(
      (member.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    const bindings: string[] = [];

    if (member.type === "TSMethodSignature" && member.parameters?.length > 0) {
      // First parameter's type annotation contains the slot props
      const firstParam = member.parameters[0];
      const propsType = firstParam?.typeAnnotation?.typeAnnotation;
      if (propsType?.type === "TSTypeLiteral") {
        for (const prop of propsType.members) {
          if (prop.type === "TSPropertySignature") {
            const propName =
              prop.key.type === "Identifier"
                ? prop.key.name
                : prop.key.type === "StringLiteral"
                  ? prop.key.value
                  : "";
            const propType = prop.typeAnnotation?.typeAnnotation
              ? resolveTypeString(prop.typeAnnotation.typeAnnotation)
              : "unknown";
            if (propName) {
              bindings.push(`${propName}: ${propType}`);
            }
          }
        }
      }
    }

    slots.push({
      name,
      description: jsdoc.description,
      bindings,
    });
  }

  return slots;
}

// --- Expose extraction ---

function extractExposes(
  obj: Extract<Expression, { type: "ObjectExpression" }>,
  _source: string,
): ExposeDoc[] {
  const exposes: ExposeDoc[] = [];

  for (const prop of obj.properties) {
    if (prop.type !== "ObjectProperty" && prop.type !== "ObjectMethod") continue;

    const key = prop.key;
    const name =
      key.type === "Identifier" ? key.name : key.type === "StringLiteral" ? key.value : "";
    if (!name) continue;

    const jsdoc = parseJSDocTags(
      (prop.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    exposes.push({
      name,
      type: "unknown",
      description: jsdoc.description,
    });
  }

  return exposes;
}

// --- Composable detection ---

function buildImportMap(ast: Statement[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const stmt of ast) {
    if (stmt.type === "ImportDeclaration") {
      for (const spec of stmt.specifiers ?? []) {
        if (spec.type === "ImportSpecifier" || spec.type === "ImportDefaultSpecifier") {
          map.set(spec.local.name, (stmt.source as any).value);
        }
      }
    }
  }
  return map;
}

function extractVariablesFromPattern(decl: any): ComposableVariable[] {
  const id = decl.id;
  if (!id) return [];

  // Simple assignment: const router = useRouter()
  if (id.type === "Identifier") {
    const v: ComposableVariable = { name: id.name };
    // Check for TS type annotation: const router: Router = useRouter()
    if (id.typeAnnotation?.typeAnnotation) {
      v.type = resolveTypeString(id.typeAnnotation.typeAnnotation);
    }
    return [v];
  }

  // Object destructuring: const { x, y } = useMouse()
  if (id.type === "ObjectPattern") {
    const vars: ComposableVariable[] = [];
    // Check for TS type annotation on the whole pattern
    const typeAnnotation = id.typeAnnotation?.typeAnnotation;
    const typeMembers = typeAnnotation?.type === "TSTypeLiteral" ? typeAnnotation.members : null;

    for (const prop of id.properties) {
      if (prop.type === "RestElement") {
        // const { a, ...rest } = ...
        const name = prop.argument?.name ?? "rest";
        vars.push({ name });
      } else if (prop.type === "ObjectProperty") {
        // const { x } = ... OR const { x: posX } = ...
        const name =
          prop.value?.type === "Identifier"
            ? prop.value.name
            : prop.value?.type === "AssignmentPattern" && prop.value.left?.type === "Identifier"
              ? prop.value.left.name
              : prop.key?.type === "Identifier"
                ? prop.key.name
                : "";
        if (!name) continue;

        const v: ComposableVariable = { name };

        // Try to get type from TS annotation on the pattern
        if (typeMembers) {
          const keyName = prop.key?.type === "Identifier" ? prop.key.name : "";
          for (const member of typeMembers) {
            if (
              member.type === "TSPropertySignature" &&
              member.key?.type === "Identifier" &&
              member.key.name === keyName &&
              member.typeAnnotation?.typeAnnotation
            ) {
              v.type = resolveTypeString(member.typeAnnotation.typeAnnotation);
              break;
            }
          }
        }

        vars.push(v);
      }
    }
    return vars;
  }

  // Array destructuring: const [count, setCount] = useCounter()
  if (id.type === "ArrayPattern") {
    const vars: ComposableVariable[] = [];
    for (const el of id.elements) {
      if (!el) continue;
      if (el.type === "Identifier") {
        vars.push({ name: el.name });
      } else if (el.type === "RestElement" && el.argument?.type === "Identifier") {
        vars.push({ name: el.argument.name });
      } else if (el.type === "AssignmentPattern" && el.left?.type === "Identifier") {
        vars.push({ name: el.left.name });
      }
    }
    return vars;
  }

  return [];
}

function extractComposables(
  ast: Statement[],
  importMap: Map<string, string>,
  sfcDir?: string,
): ComposableDoc[] {
  const seen = new Set<string>();
  const composables: ComposableDoc[] = [];

  for (const stmt of ast) {
    // Bare call: useHead({...})
    if (
      stmt.type === "ExpressionStatement" &&
      stmt.expression.type === "CallExpression" &&
      stmt.expression.callee.type === "Identifier" &&
      /^use[A-Z]/.test(stmt.expression.callee.name)
    ) {
      const name = stmt.expression.callee.name;
      if (!seen.has(name)) {
        seen.add(name);
        composables.push({
          name,
          source: importMap.get(name),
          variables: [],
        });
      }
    }

    // Variable declaration: const x = useX() / const { a, b } = useX()
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (
          decl.init?.type === "CallExpression" &&
          decl.init.callee.type === "Identifier" &&
          /^use[A-Z]/.test(decl.init.callee.name)
        ) {
          const name = decl.init.callee.name;
          if (seen.has(name)) continue;
          seen.add(name);

          const variables = extractVariablesFromPattern(decl);
          const source = importMap.get(name);

          // Try cross-file type resolution for variables without types
          const needsResolution = variables.some((v) => !v.type);
          if (needsResolution && sfcDir && source) {
            const resolvedPath = resolveImportPath(source, sfcDir);
            if (resolvedPath) {
              const varNames = variables.filter((v) => !v.type).map((v) => v.name);
              const typeMap = resolveComposableTypes(resolvedPath, name, varNames);
              for (const v of variables) {
                if (!v.type && typeMap.has(v.name)) {
                  v.type = typeMap.get(v.name);
                }
              }
            }
          }

          composables.push({ name, source, variables });
        }
      }
    }
  }

  return composables;
}

// --- Ref and Computed extraction ---

const REF_CALLEES = new Set(["ref", "shallowRef", "reactive", "shallowReactive"]);
const COMPUTED_CALLEES = new Set(["computed"]);
const SKIP_CALLEES = new Set([
  "defineProps",
  "defineEmits",
  "defineSlots",
  "defineExpose",
  "withDefaults",
]);

function inferLiteralType(node: Expression): string | null {
  switch (node.type) {
    case "StringLiteral":
      return "string";
    case "NumericLiteral":
      return "number";
    case "BooleanLiteral":
      return "boolean";
    case "ArrayExpression":
      return "Array";
    case "ObjectExpression":
      return "Object";
    case "NullLiteral":
      return "null";
    default:
      return null;
  }
}

function extractRefsAndComputeds(
  ast: Statement[],
  _scriptSource: string,
): { refs: RefDoc[]; computeds: ComputedDoc[] } {
  const refs: RefDoc[] = [];
  const computeds: ComputedDoc[] = [];

  for (const stmt of ast) {
    if (stmt.type !== "VariableDeclaration") continue;

    const comments = (stmt.leadingComments ?? []) as Array<{ type: string; value: string }>;

    for (const decl of stmt.declarations) {
      if (!decl.init || decl.init.type !== "CallExpression") continue;
      if (decl.init.callee.type !== "Identifier") continue;

      const calleeName = decl.init.callee.name;

      // Skip composables (use[A-Z]*) and define* macros
      if (/^use[A-Z]/.test(calleeName)) continue;
      if (SKIP_CALLEES.has(calleeName)) continue;

      const isRef = REF_CALLEES.has(calleeName);
      const isComputed = COMPUTED_CALLEES.has(calleeName);
      if (!isRef && !isComputed) continue;

      // Get the variable name
      const id = decl.id;
      if (!id || id.type !== "Identifier") continue;
      const varName = id.name;

      const jsdoc = parseJSDocTags(comments);

      const callExpr = decl.init;
      const typeParams = callExpr.typeParameters as TSTypeParameterInstantiation | undefined;
      const args = callExpr.arguments as Expression[];

      let type: string;

      // Priority 1: Explicit TS annotation on the variable
      if ((id.typeAnnotation as any)?.typeAnnotation) {
        type = resolveTypeString((id.typeAnnotation as any).typeAnnotation);
      }
      // Priority 2: Generic type parameter e.g. ref<string>()
      else if (typeParams?.params?.[0]) {
        const genericType = resolveTypeString(typeParams.params[0]);
        if (calleeName === "reactive" || calleeName === "shallowReactive") {
          type = genericType;
        } else if (calleeName === "shallowRef") {
          type = `ShallowRef<${genericType}>`;
        } else if (calleeName === "computed") {
          type = `ComputedRef<${genericType}>`;
        } else {
          // ref
          type = `Ref<${genericType}>`;
        }
      }
      // Priority 3: Infer from argument literal
      else if (isRef && args[0]) {
        const literalType = inferLiteralType(args[0]);
        if (literalType) {
          if (calleeName === "reactive" || calleeName === "shallowReactive") {
            type = literalType;
          } else if (calleeName === "shallowRef") {
            type = `ShallowRef<${literalType}>`;
          } else {
            type = `Ref<${literalType}>`;
          }
        } else {
          // Non-literal argument, fallback
          if (calleeName === "reactive") type = "Object";
          else if (calleeName === "shallowReactive") type = "Object";
          else if (calleeName === "shallowRef") type = "ShallowRef";
          else type = "Ref";
        }
      }
      // Priority 3 for computed: check getter return type annotation
      else if (isComputed && args[0]) {
        let returnType: string | null = null;
        const getter = args[0];
        if (
          (getter.type === "ArrowFunctionExpression" || getter.type === "FunctionExpression") &&
          getter.returnType?.type === "TSTypeAnnotation"
        ) {
          returnType = resolveTypeString(getter.returnType.typeAnnotation);
        }
        if (returnType) {
          type = `ComputedRef<${returnType}>`;
        } else {
          type = "ComputedRef";
        }
      }
      // Priority 4: Fallback (no args, no generics)
      else {
        if (calleeName === "reactive") type = "Object";
        else if (calleeName === "shallowReactive") type = "Object";
        else if (calleeName === "shallowRef") type = "ShallowRef";
        else if (calleeName === "computed") type = "ComputedRef";
        else type = "Ref";
      }

      const docEntry = {
        name: varName,
        type,
        description: jsdoc.description,
        ...(jsdoc.deprecated !== undefined && { deprecated: jsdoc.deprecated }),
        ...(jsdoc.since && { since: jsdoc.since }),
        ...(jsdoc.example && { example: jsdoc.example }),
        ...(jsdoc.see && { see: jsdoc.see }),
      };

      if (isRef) {
        refs.push(docEntry);
      } else {
        computeds.push(docEntry);
      }
    }
  }

  return { refs, computeds };
}

// --- Template slot extraction ---

function extractTemplateSlots(templateAst: any): SlotDoc[] {
  const slots: SlotDoc[] = [];
  walkTemplate(templateAst.children ?? [], slots);
  return slots;
}

function walkTemplate(children: any[], slots: SlotDoc[]): void {
  for (const node of children) {
    // Element node with slot tag
    // In Vue's compiler AST: type 1 = ELEMENT, tagType 2 = SLOT
    if (node.type === 1 && node.tag === "slot") {
      let name = "default";
      const bindings: string[] = [];

      for (const prop of node.props ?? []) {
        // Static attribute: type 6 = ATTRIBUTE
        if (prop.type === 6 && prop.name === "name" && prop.value?.content) {
          name = prop.value.content;
        }
        // Directive: type 7 = DIRECTIVE
        if (prop.type === 7 && prop.name === "bind" && prop.arg?.content) {
          bindings.push(prop.arg.content);
        }
      }

      slots.push({ name, description: "", bindings });
    }

    // Recurse into children
    if (node.children) {
      walkTemplate(node.children, slots);
    }
    // Also check branches (v-if/v-else)
    if (node.branches) {
      for (const branch of node.branches) {
        if (branch.children) {
          walkTemplate(branch.children, slots);
        }
      }
    }
  }
}

// --- Options API ---

function extractOptionsAPI(
  ast: Statement[],
  source: string,
): { props: PropDoc[]; emits: EmitDoc[]; refs: RefDoc[]; computeds: ComputedDoc[] } {
  let props: PropDoc[] = [];
  let emits: EmitDoc[] = [];
  let refs: RefDoc[] = [];
  let computeds: ComputedDoc[] = [];

  for (const stmt of ast) {
    if (stmt.type !== "ExportDefaultDeclaration") continue;
    const decl = stmt.declaration;
    if (decl.type !== "ObjectExpression") continue;

    for (const prop of decl.properties) {
      if (prop.type !== "ObjectProperty" && prop.type !== "ObjectMethod") continue;
      const key = prop.key;
      const name = key.type === "Identifier" ? key.name : "";

      if (name === "props") {
        if (prop.type !== "ObjectProperty") continue;
        if (prop.value.type === "ObjectExpression") {
          props = extractProps(
            prop.value as Extract<Expression, { type: "ObjectExpression" }>,
            source,
          );
        } else if (prop.value.type === "ArrayExpression") {
          props = extractArrayProps(prop.value as Extract<Expression, { type: "ArrayExpression" }>);
        }
      } else if (name === "emits") {
        if (prop.type !== "ObjectProperty") continue;
        if (prop.value.type === "ArrayExpression") {
          const comments = (stmt.leadingComments ?? []) as Array<{ type: string; value: string }>;
          emits = extractEmits(
            prop.value as Extract<Expression, { type: "ArrayExpression" }>,
            comments,
          );
        } else if (prop.value.type === "ObjectExpression") {
          emits = extractObjectEmits(
            prop.value as Extract<Expression, { type: "ObjectExpression" }>,
          );
        }
      } else if (name === "data") {
        refs = extractOptionsData(prop);
      } else if (name === "computed") {
        if (prop.type !== "ObjectProperty") continue;
        if (prop.value.type === "ObjectExpression") {
          computeds = extractOptionsComputed(prop.value);
        }
      }
    }

    break; // only process first export default
  }

  return { props, emits, refs, computeds };
}

function extractOptionsData(prop: any): RefDoc[] {
  const refs: RefDoc[] = [];

  // data can be ObjectMethod: data() { return {...} }
  // or ObjectProperty with ArrowFunctionExpression/FunctionExpression value
  let body: any = null;

  if (prop.type === "ObjectMethod") {
    body = prop.body;
  } else if (prop.type === "ObjectProperty") {
    const val = prop.value;
    if (val.type === "ArrowFunctionExpression" || val.type === "FunctionExpression") {
      body = val.body;
    }
  }

  if (!body) return refs;

  // Find the return statement
  let returnArg: any = null;

  if (body.type === "ObjectExpression") {
    // Arrow with implicit return: data: () => ({ count: 0 })
    returnArg = body;
  } else if (body.type === "BlockStatement") {
    for (const s of body.body) {
      if (s.type === "ReturnStatement" && s.argument?.type === "ObjectExpression") {
        returnArg = s.argument;
        break;
      }
    }
  }

  if (!returnArg || returnArg.type !== "ObjectExpression") return refs;

  for (const p of returnArg.properties) {
    if (p.type !== "ObjectProperty") continue;
    const name =
      p.key.type === "Identifier" ? p.key.name : p.key.type === "StringLiteral" ? p.key.value : "";
    if (!name) continue;

    const jsdoc = parseJSDocTags(
      (p.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    const literalType = inferLiteralType(p.value as Expression);
    const type = literalType ?? "unknown";

    refs.push({
      name,
      type,
      description: jsdoc.description,
      ...(jsdoc.deprecated !== undefined && { deprecated: jsdoc.deprecated }),
      ...(jsdoc.since && { since: jsdoc.since }),
      ...(jsdoc.example && { example: jsdoc.example }),
      ...(jsdoc.see && { see: jsdoc.see }),
    });
  }

  return refs;
}

function extractOptionsComputed(obj: any): ComputedDoc[] {
  const computeds: ComputedDoc[] = [];

  for (const prop of obj.properties) {
    if (prop.type !== "ObjectProperty" && prop.type !== "ObjectMethod") continue;

    const name =
      prop.key.type === "Identifier"
        ? prop.key.name
        : prop.key.type === "StringLiteral"
          ? prop.key.value
          : "";
    if (!name) continue;

    const jsdoc = parseJSDocTags(
      (prop.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    let type = "unknown";

    if (prop.type === "ObjectMethod") {
      // computed: { fullName() { return ... } }
      if (prop.returnType?.type === "TSTypeAnnotation") {
        type = resolveTypeString(prop.returnType.typeAnnotation);
      }
    } else if (prop.type === "ObjectProperty") {
      const val = prop.value;
      if (val.type === "ObjectExpression") {
        // get/set syntax: computed: { fullName: { get() {}, set() {} } }
        for (const member of val.properties) {
          if (
            member.type === "ObjectMethod" &&
            member.key?.type === "Identifier" &&
            member.key.name === "get"
          ) {
            if (member.returnType?.type === "TSTypeAnnotation") {
              type = resolveTypeString(member.returnType.typeAnnotation);
            }
            break;
          }
        }
      } else if (val.type === "ArrowFunctionExpression" || val.type === "FunctionExpression") {
        // computed: { fullName: () => ... } or computed: { fullName: function() { ... } }
        if (val.returnType?.type === "TSTypeAnnotation") {
          type = resolveTypeString(val.returnType.typeAnnotation);
        }
      }
    }

    computeds.push({
      name,
      type,
      description: jsdoc.description,
      ...(jsdoc.deprecated !== undefined && { deprecated: jsdoc.deprecated }),
      ...(jsdoc.since && { since: jsdoc.since }),
      ...(jsdoc.example && { example: jsdoc.example }),
      ...(jsdoc.see && { see: jsdoc.see }),
    });
  }

  return computeds;
}

function extractArrayProps(arr: Extract<Expression, { type: "ArrayExpression" }>): PropDoc[] {
  const props: PropDoc[] = [];
  for (const el of arr.elements) {
    if (el?.type === "StringLiteral") {
      props.push({
        name: el.value,
        type: "unknown",
        required: false,
        default: undefined,
        description: "",
      });
    }
  }
  return props;
}

function extractObjectEmits(obj: Extract<Expression, { type: "ObjectExpression" }>): EmitDoc[] {
  const emits: EmitDoc[] = [];
  for (const prop of obj.properties) {
    if (prop.type !== "ObjectProperty") continue;
    const name =
      prop.key.type === "Identifier"
        ? prop.key.name
        : prop.key.type === "StringLiteral"
          ? prop.key.value
          : "";
    if (!name) continue;

    const jsdoc = parseJSDocTags(
      (prop.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    emits.push({ name, description: jsdoc.description });
  }
  return emits;
}

// --- Utilities ---

function stringifyDefault(node: Expression, source: string): string {
  switch (node.type) {
    case "StringLiteral":
      return JSON.stringify(node.value);
    case "NumericLiteral":
      return String(node.value);
    case "BooleanLiteral":
      return String(node.value);
    case "NullLiteral":
      return "null";
    case "ArrowFunctionExpression":
    case "FunctionExpression":
      if (node.start != null && node.end != null) {
        return source.slice(node.start, node.end);
      }
      return "...";
    default:
      return "...";
  }
}
