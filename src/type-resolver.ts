import { readFileSync } from "node:fs";
import { babelParse } from "@vue/compiler-sfc";
import type { Statement } from "@babel/types";
import { resolveImportPath } from "./resolver.ts";

export function resolveImportedPropsType(
  typeName: string,
  importMap: Map<string, string>,
  sfcDir: string,
): { members: Array<any> } | null {
  const source = importMap.get(typeName);
  if (!source) return null;

  const resolvedPath = resolveImportPath(source, sfcDir);
  if (!resolvedPath) return null;

  try {
    const fileContent = readFileSync(resolvedPath, "utf-8");
    const ast = babelParse(fileContent, {
      plugins: ["typescript"],
      sourceType: "module",
    });

    return findExportedType(ast.program.body, typeName, 0);
  } catch {
    return null;
  }
}

function findExportedType(
  stmts: Statement[],
  typeName: string,
  depth: number,
): { members: Array<any> } | null {
  if (depth > 5) return null;

  for (const stmt of stmts) {
    // export interface Props { ... }
    if (
      stmt.type === "ExportNamedDeclaration" &&
      stmt.declaration?.type === "TSInterfaceDeclaration" &&
      stmt.declaration.id.name === typeName
    ) {
      return resolveInterfaceMembers(stmt.declaration, stmts, depth);
    }

    // export type Props = { ... }
    if (
      stmt.type === "ExportNamedDeclaration" &&
      stmt.declaration?.type === "TSTypeAliasDeclaration" &&
      stmt.declaration.id.name === typeName &&
      stmt.declaration.typeAnnotation.type === "TSTypeLiteral"
    ) {
      return { members: [...stmt.declaration.typeAnnotation.members] };
    }
  }

  // Check for separate export { typeName }
  if (hasNamedExport(stmts, typeName)) {
    return findTypeInFile(stmts, typeName, depth);
  }

  return null;
}

function findTypeInFile(
  stmts: Statement[],
  typeName: string,
  depth: number,
): { members: Array<any> } | null {
  if (depth > 5) return null;

  for (const stmt of stmts) {
    // export interface Props { ... }
    if (
      stmt.type === "ExportNamedDeclaration" &&
      stmt.declaration?.type === "TSInterfaceDeclaration" &&
      stmt.declaration.id.name === typeName
    ) {
      return resolveInterfaceMembers(stmt.declaration, stmts, depth);
    }

    // export type Props = { ... }
    if (
      stmt.type === "ExportNamedDeclaration" &&
      stmt.declaration?.type === "TSTypeAliasDeclaration" &&
      stmt.declaration.id.name === typeName &&
      stmt.declaration.typeAnnotation.type === "TSTypeLiteral"
    ) {
      return { members: [...stmt.declaration.typeAnnotation.members] };
    }

    // interface Props { ... } (non-exported or extends target)
    if (stmt.type === "TSInterfaceDeclaration" && stmt.id.name === typeName) {
      return resolveInterfaceMembers(stmt, stmts, depth);
    }

    // type Props = { ... } (non-exported or extends target)
    if (
      stmt.type === "TSTypeAliasDeclaration" &&
      stmt.id.name === typeName &&
      stmt.typeAnnotation.type === "TSTypeLiteral"
    ) {
      return { members: [...stmt.typeAnnotation.members] };
    }
  }

  return null;
}

function resolveInterfaceMembers(
  decl: any,
  stmts: Statement[],
  depth: number,
): { members: Array<any> } {
  const members: Array<any> = [];

  // Handle extends
  if (decl.extends) {
    for (const ext of decl.extends) {
      const parentName = ext.expression?.type === "Identifier" ? ext.expression.name : null;
      if (parentName) {
        const parent = findTypeInFile(stmts, parentName, depth + 1);
        if (parent) {
          members.push(...parent.members);
        }
      }
    }
  }

  members.push(...decl.body.body);
  return { members };
}

function hasNamedExport(stmts: Statement[], name: string): boolean {
  return stmts.some(
    (s) =>
      s.type === "ExportNamedDeclaration" &&
      !s.declaration &&
      s.specifiers.some(
        (spec) =>
          spec.type === "ExportSpecifier" &&
          ((spec.local.type === "Identifier" && spec.local.name === name) ||
            (spec.exported.type === "Identifier" && spec.exported.name === name)),
      ),
  );
}
