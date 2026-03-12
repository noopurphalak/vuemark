import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { babelParse } from "@vue/compiler-sfc";
import type { Statement, Expression, Node } from "@babel/types";

// --- Import path resolution ---

export function resolveImportPath(importSource: string, sfcDir: string): string | null {
  try {
    // Skip node_modules / bare specifiers
    if (
      !importSource.startsWith(".") &&
      !importSource.startsWith("@/") &&
      !importSource.startsWith("~/")
    ) {
      return null;
    }

    // Relative imports
    if (importSource.startsWith("./") || importSource.startsWith("../")) {
      return tryResolveFile(resolve(sfcDir, importSource));
    }

    // Alias imports (e.g. @/..., ~/...)
    const tsconfig = findTsConfig(sfcDir);
    if (!tsconfig) return null;

    const { paths, baseUrl } = readTsConfigPaths(tsconfig);
    if (!paths) return null;

    const configDir = dirname(tsconfig);
    const resolvedBaseUrl = baseUrl ? resolve(configDir, baseUrl) : configDir;

    for (const [pattern, targets] of Object.entries(paths)) {
      const prefix = pattern.replace(/\*$/, "");
      if (!importSource.startsWith(prefix)) continue;

      const remainder = importSource.slice(prefix.length);

      for (const target of targets) {
        const mappedPath = resolve(resolvedBaseUrl, target.replace(/\*$/, "") + remainder);
        const result = tryResolveFile(mappedPath);
        if (result) return result;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function tryResolveFile(basePath: string): string | null {
  // Exact file
  if (existsSync(basePath) && !isDirectory(basePath)) return basePath;

  // Try extensions
  const extensions = [".ts", ".js"];
  for (const ext of extensions) {
    const candidate = basePath + ext;
    if (existsSync(candidate)) return candidate;
  }

  // Try index files
  const indexExtensions = ["/index.ts", "/index.js"];
  for (const ext of indexExtensions) {
    const candidate = basePath + ext;
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function findTsConfig(startDir: string): string | null {
  let dir = resolve(startDir);
  const root = resolve("/");

  while (dir !== root) {
    const tsconfig = join(dir, "tsconfig.json");
    if (existsSync(tsconfig)) return tsconfig;

    const jsconfig = join(dir, "jsconfig.json");
    if (existsSync(jsconfig)) return jsconfig;

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

interface TsConfigPaths {
  paths: Record<string, string[]> | null;
  baseUrl: string | undefined;
}

function readTsConfigPaths(configPath: string): TsConfigPaths {
  try {
    const content = JSON.parse(readFileSync(configPath, "utf-8"));
    let paths = content.compilerOptions?.paths ?? null;
    let baseUrl = content.compilerOptions?.baseUrl;

    // Handle extends (one level deep)
    if (content.extends) {
      const parentPath = resolve(dirname(configPath), content.extends);
      const parentConfigFile = parentPath.endsWith(".json") ? parentPath : parentPath + ".json";

      if (existsSync(parentConfigFile)) {
        try {
          const parentContent = JSON.parse(readFileSync(parentConfigFile, "utf-8"));
          const parentPaths = parentContent.compilerOptions?.paths;
          const parentBaseUrl = parentContent.compilerOptions?.baseUrl;

          if (!paths && parentPaths) {
            paths = parentPaths;
          }
          if (!baseUrl && parentBaseUrl) {
            baseUrl = parentBaseUrl;
          }
        } catch {
          // Ignore parent parse errors
        }
      }
    }

    return { paths, baseUrl };
  } catch {
    return { paths: null, baseUrl: undefined };
  }
}

// --- Composable type resolution ---

export function resolveComposableTypes(
  filePath: string,
  exportName: string,
  variableNames: string[],
): Map<string, string> {
  try {
    const source = readFileSync(filePath, "utf-8");
    const ast = babelParse(source, {
      plugins: ["typescript", "jsx"],
      sourceType: "module",
    });

    const funcNode = findExportedFunction(ast.program.body, exportName);
    if (!funcNode) return new Map();

    const body = getFunctionBody(funcNode);
    if (!body) return new Map();

    const returnProps = findReturnProperties(body);
    if (!returnProps) return new Map();

    const result = new Map<string, string>();
    const nameSet = new Set(variableNames);

    for (const prop of returnProps) {
      // Shorthand property: { foo } — prop.shorthand === true
      // Or regular property: { foo: foo }
      let propName: string | null = null;

      if (prop.type === "ObjectProperty") {
        propName =
          prop.key.type === "Identifier"
            ? prop.key.name
            : prop.key.type === "StringLiteral"
              ? prop.key.value
              : null;
      } else if (prop.type === "ObjectMethod") {
        propName = prop.key.type === "Identifier" ? prop.key.name : null;
        if (propName && nameSet.has(propName)) {
          result.set(propName, inferFunctionSignature(prop));
        }
        continue;
      } else if (prop.type === "SpreadElement") {
        continue;
      }

      if (!propName || !nameSet.has(propName)) continue;

      // For shorthand properties, trace back to the declaration in the function body
      if (prop.type === "ObjectProperty" && prop.shorthand) {
        const type = traceVariableType(propName, body);
        result.set(propName, type);
      } else if (prop.type === "ObjectProperty") {
        // Non-shorthand: { foo: someExpr }
        const type = inferType(prop.value as Expression);
        result.set(propName, type);
      }
    }

    return result;
  } catch {
    return new Map();
  }
}

// --- AST helpers ---

type FunctionNode =
  | Extract<Node, { type: "FunctionDeclaration" }>
  | Extract<Node, { type: "FunctionExpression" }>
  | Extract<Node, { type: "ArrowFunctionExpression" }>;

function findExportedFunction(stmts: Statement[], exportName: string): FunctionNode | null {
  for (const stmt of stmts) {
    // export function useFoo() { ... }
    if (
      stmt.type === "ExportNamedDeclaration" &&
      stmt.declaration?.type === "FunctionDeclaration" &&
      stmt.declaration.id?.name === exportName
    ) {
      return stmt.declaration as FunctionNode;
    }

    // export const useFoo = () => { ... }
    // export const useFoo = function() { ... }
    if (
      stmt.type === "ExportNamedDeclaration" &&
      stmt.declaration?.type === "VariableDeclaration"
    ) {
      for (const decl of stmt.declaration.declarations) {
        if (
          decl.id.type === "Identifier" &&
          decl.id.name === exportName &&
          decl.init &&
          (decl.init.type === "ArrowFunctionExpression" || decl.init.type === "FunctionExpression")
        ) {
          return decl.init as FunctionNode;
        }
      }
    }

    // export default function useFoo() { ... }
    if (
      stmt.type === "ExportDefaultDeclaration" &&
      stmt.declaration.type === "FunctionDeclaration" &&
      stmt.declaration.id?.name === exportName
    ) {
      return stmt.declaration as FunctionNode;
    }

    // export default function() { ... } (anonymous default, matches any exportName)
    if (
      stmt.type === "ExportDefaultDeclaration" &&
      stmt.declaration.type === "FunctionDeclaration" &&
      !stmt.declaration.id
    ) {
      return stmt.declaration as FunctionNode;
    }

    // export default () => { ... }
    if (
      stmt.type === "ExportDefaultDeclaration" &&
      (stmt.declaration.type === "ArrowFunctionExpression" ||
        stmt.declaration.type === "FunctionExpression")
    ) {
      return stmt.declaration as FunctionNode;
    }

    // Non-exported function, then exported via `export { useFoo }`
    if (stmt.type === "FunctionDeclaration" && stmt.id?.name === exportName) {
      // Check if there's a matching export specifier elsewhere
      const hasExport = stmts.some(
        (s) =>
          s.type === "ExportNamedDeclaration" &&
          !s.declaration &&
          s.specifiers.some(
            (spec) =>
              spec.type === "ExportSpecifier" &&
              ((spec.local.type === "Identifier" && spec.local.name === exportName) ||
                (spec.exported.type === "Identifier" && spec.exported.name === exportName)),
          ),
      );
      if (hasExport) {
        return stmt as FunctionNode;
      }
    }

    // const useFoo = () => { ... }; export { useFoo }
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (
          decl.id.type === "Identifier" &&
          decl.id.name === exportName &&
          decl.init &&
          (decl.init.type === "ArrowFunctionExpression" || decl.init.type === "FunctionExpression")
        ) {
          const hasExport = stmts.some(
            (s) =>
              s.type === "ExportNamedDeclaration" &&
              !s.declaration &&
              s.specifiers.some(
                (spec) =>
                  spec.type === "ExportSpecifier" &&
                  ((spec.local.type === "Identifier" && spec.local.name === exportName) ||
                    (spec.exported.type === "Identifier" && spec.exported.name === exportName)),
              ),
          );
          if (hasExport) {
            return decl.init as FunctionNode;
          }
        }
      }
    }
  }

  return null;
}

function getFunctionBody(node: FunctionNode): Statement[] | null {
  if (node.body.type === "BlockStatement") {
    return node.body.body;
  }
  return null;
}

function findReturnProperties(body: Statement[]): Array<any> | null {
  // Find the last return statement in the function body
  for (let i = body.length - 1; i >= 0; i--) {
    const stmt = body[i]!;
    if (stmt.type === "ReturnStatement" && stmt.argument?.type === "ObjectExpression") {
      return stmt.argument.properties;
    }
  }
  return null;
}

// --- Variable tracing ---

function traceVariableType(name: string, body: Statement[]): string {
  // Search backward through the function body for a declaration of `name`
  for (let i = body.length - 1; i >= 0; i--) {
    const stmt = body[i]!;

    // function name(...) { ... }
    if (stmt.type === "FunctionDeclaration" && stmt.id?.name === name) {
      return inferFunctionSignature(stmt);
    }

    // const name = ..., let name = ...
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (decl.id.type === "Identifier" && decl.id.name === name && decl.init) {
          return inferType(decl.init as Expression);
        }
      }
    }
  }

  return "unknown";
}

// --- Type inference ---

function inferType(node: Expression): string {
  // ref<Type>(...) — with explicit generic
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "ref"
  ) {
    const typeParams = (node as any).typeParameters;
    if (typeParams?.params?.length > 0) {
      const typeStr = resolveTypeAnnotation(typeParams.params[0]);
      return `Ref<${typeStr}>`;
    }

    // ref(...) — infer from argument
    const arg = node.arguments[0] as Expression | undefined;
    if (!arg) return "Ref<unknown>";
    return `Ref<${inferLiteralType(arg)}>`;
  }

  // computed(() => ...)
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "computed"
  ) {
    return "ComputedRef";
  }

  // reactive({...})
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "reactive"
  ) {
    return "Object";
  }

  // Arrow function or function expression
  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    return inferFunctionSignature(node);
  }

  // Another composable call useX()
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    /^use[A-Z]/.test(node.callee.name)
  ) {
    return "unknown";
  }

  // Literal values
  return inferLiteralType(node);
}

function inferLiteralType(node: Expression): string {
  switch (node.type) {
    case "NumericLiteral":
      return "number";
    case "StringLiteral":
      return "string";
    case "BooleanLiteral":
      return "boolean";
    case "NullLiteral":
      return "null";
    case "TemplateLiteral":
      return "string";
    case "ArrayExpression":
      return "Array";
    case "ObjectExpression":
      return "Object";
    default:
      return "unknown";
  }
}

// --- Function signature extraction ---

function inferFunctionSignature(node: any): string {
  const params = extractParams(node.params ?? []);
  const returnType = extractReturnType(node);
  return `(${params}) => ${returnType}`;
}

function extractParams(params: any[]): string {
  return params
    .map((param) => {
      if (param.type === "Identifier") {
        const annotation = param.typeAnnotation?.typeAnnotation;
        if (annotation) {
          return `${param.name}: ${resolveTypeAnnotation(annotation)}`;
        }
        return param.name;
      }

      if (param.type === "AssignmentPattern") {
        const left = param.left;
        if (left.type === "Identifier") {
          const annotation = left.typeAnnotation?.typeAnnotation;
          if (annotation) {
            return `${left.name}: ${resolveTypeAnnotation(annotation)}`;
          }
          return left.name;
        }
        return "arg";
      }

      if (param.type === "RestElement") {
        const arg = param.argument;
        if (arg.type === "Identifier") {
          const annotation = arg.typeAnnotation?.typeAnnotation;
          if (annotation) {
            return `...${arg.name}: ${resolveTypeAnnotation(annotation)}`;
          }
          return `...${arg.name}`;
        }
        return "...args";
      }

      if (param.type === "ObjectPattern") {
        return "options";
      }

      if (param.type === "ArrayPattern") {
        return "args";
      }

      return "arg";
    })
    .join(", ");
}

function extractReturnType(node: any): string {
  // Explicit TS return type annotation
  const annotation = node.returnType?.typeAnnotation ?? node.typeAnnotation?.typeAnnotation;

  let baseType: string;

  if (annotation) {
    baseType = resolveTypeAnnotation(annotation);
  } else {
    baseType = "void";
  }

  // Wrap in Promise if async
  if (node.async && baseType !== "void") {
    return `Promise<${baseType}>`;
  }
  if (node.async) {
    return "Promise<void>";
  }

  return baseType;
}

// --- Type annotation resolution ---

function resolveTypeAnnotation(node: any): string {
  if (!node) return "unknown";

  switch (node.type) {
    case "TSStringKeyword":
      return "string";
    case "TSNumberKeyword":
      return "number";
    case "TSBooleanKeyword":
      return "boolean";
    case "TSVoidKeyword":
      return "void";
    case "TSAnyKeyword":
      return "any";
    case "TSNullKeyword":
      return "null";
    case "TSUndefinedKeyword":
      return "undefined";
    case "TSObjectKeyword":
      return "object";
    case "TSNeverKeyword":
      return "never";
    case "TSUnknownKeyword":
      return "unknown";

    case "TSTypeReference": {
      const name =
        node.typeName?.type === "Identifier"
          ? node.typeName.name
          : node.typeName?.type === "TSQualifiedName"
            ? `${node.typeName.left?.name ?? ""}.${node.typeName.right?.name ?? ""}`
            : "unknown";

      if (node.typeParameters?.params?.length > 0) {
        const params = node.typeParameters.params
          .map((p: any) => resolveTypeAnnotation(p))
          .join(", ");
        return `${name}<${params}>`;
      }
      return name;
    }

    case "TSUnionType":
      return node.types.map((t: any) => resolveTypeAnnotation(t)).join(" | ");

    case "TSIntersectionType":
      return node.types.map((t: any) => resolveTypeAnnotation(t)).join(" & ");

    case "TSArrayType":
      return `${resolveTypeAnnotation(node.elementType)}[]`;

    case "TSLiteralType": {
      if (node.literal.type === "StringLiteral") return `'${node.literal.value}'`;
      if (node.literal.type === "NumericLiteral") return String(node.literal.value);
      if (node.literal.type === "BooleanLiteral") return String(node.literal.value);
      return "unknown";
    }

    case "TSFunctionType":
      return "Function";

    case "TSTupleType":
      return `[${(node.elementTypes ?? []).map((t: any) => resolveTypeAnnotation(t)).join(", ")}]`;

    case "TSParenthesizedType":
      return resolveTypeAnnotation(node.typeAnnotation);

    case "TSTypeLiteral":
      return "object";

    default:
      return "unknown";
  }
}
