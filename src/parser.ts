import { parse, compileScript } from "@vue/compiler-sfc";
import type { Statement, Expression, ObjectProperty, TSTypeParameterInstantiation } from "@babel/types";
import type { ComponentDoc, PropDoc, EmitDoc } from "./types.ts";

export function parseSFC(source: string, filename: string): ComponentDoc {
  const name =
    filename
      .replace(/\.vue$/, "")
      .split("/")
      .pop() ?? "Unknown";
  const doc: ComponentDoc = { name, props: [], emits: [] };

  const { descriptor } = parse(source, { filename });

  if (!descriptor.scriptSetup && !descriptor.script) {
    return doc;
  }

  const compiled = compileScript(descriptor, { id: filename });
  const ast = compiled.scriptSetupAst;

  if (!ast) {
    return doc;
  }

  // AST node offsets map to the scriptSetup content, not compiled.content
  const scriptSource = descriptor.scriptSetup?.content ?? compiled.content;

  for (const stmt of ast) {
    const calls = extractDefineCalls(stmt);
    for (const { callee, args, leadingComments, typeParams, defaultsArg } of calls) {
      if (callee === "defineProps" && args[0]?.type === "ObjectExpression") {
        doc.props = extractProps(args[0], scriptSource);
      } else if (
        callee === "defineProps" &&
        typeParams?.params[0]?.type === "TSTypeLiteral"
      ) {
        doc.props = extractTypeProps(typeParams.params[0], defaultsArg, scriptSource);
      } else if (callee === "defineEmits" && args[0]?.type === "ArrayExpression") {
        doc.emits = extractEmits(args[0], leadingComments);
      }
    }
  }

  return doc;
}

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
    (stmt.expression.callee.type === "Identifier")
  ) {
    calls.push(processCallExpression(stmt.expression, comments));
  }

  if (stmt.type === "VariableDeclaration") {
    for (const decl of stmt.declarations) {
      if (decl.init?.type === "CallExpression" && (decl.init.callee.type === "Identifier")) {
        calls.push(processCallExpression(decl.init, comments));
      }
    }
  }

  return calls;
}

function extractTypeProps(
  typeLiteral: { members: Array<any> },
  defaultsArg: Expression | undefined,
  source: string,
): PropDoc[] {
  const defaults = defaultsArg?.type === "ObjectExpression"
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

    const description = extractJSDoc(
      (member.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    props.push({
      name,
      type,
      required: !member.optional,
      default: defaults.get(name),
      description,
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

    const description = extractJSDoc(
      (p.leadingComments ?? []) as Array<{ type: string; value: string }>,
    );

    if (p.value.type === "Identifier") {
      // Shorthand: { name: String }
      props.push({
        name,
        type: p.value.name,
        required: false,
        default: undefined,
        description,
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
        description,
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

      props.push({ name, type, required, default: defaultVal, description });
    }
  }

  return props;
}

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

function extractJSDoc(comments: Array<{ type: string; value: string }>): string {
  for (let i = comments.length - 1; i >= 0; i--) {
    const c = comments[i]!;
    if (c.type !== "CommentBlock") continue;

    const lines = c.value
      .split("\n")
      .map((l) => l.replace(/^\s*\*\s?/, "").trim())
      .filter((l) => l && !l.startsWith("@") && !l.startsWith("/"));

    if (lines.length > 0) {
      return lines.join(" ");
    }
  }
  return "";
}

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
