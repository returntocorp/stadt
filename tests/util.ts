import * as adt from "../src/adt";
import { Converter } from "../src/index";
import * as ts from "typescript";
// Parses the given string as source code.
export function parse(source: string): ts.Program {
  const options: ts.CompilerOptions = {
    allowJs: true,
    target: ts.ScriptTarget.ES2019,
    strict: true
  };
  const sourceFile = ts.createSourceFile(
    "input.ts",
    source,
    ts.ScriptTarget.ES2019
  );
  const originalHost = ts.createCompilerHost(options);
  const inMemoryHost: ts.CompilerHost = {
    ...originalHost,
    getSourceFile(fileName, languageVersion) {
      return fileName === "input.ts"
        ? sourceFile
        : originalHost.getSourceFile(fileName, languageVersion);
    },
    writeFile(_name, _text) {}
  };
  return ts.createProgram(["input.ts"], options, inMemoryHost);
}

// Returns the type of the variable with the given name. Only call this if
// there's exactly one variable with that name. Throws if no such variable
// exists.
export function getTypeOf(
  name: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): adt.Type {
  let ty: ts.Type | undefined;
  function visit(node: ts.Node) {
    ts.isIdentifier;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
    ) {
      ty = checker.getTypeAtLocation(node);
      if (ty === undefined) {
        throw new Error("Found node, but its type was undefined?");
      }
    } else {
      ts.forEachChild(node, visit);
    }
  }
  ts.forEachChild(sourceFile, visit);
  if (ty) {
    return new Converter(checker).convert(ty);
  } else {
    throw new Error("Failed to find node with the proper name");
  }
}

// Parses the given source code, returning the type of the declared variable with the given name.
export function parseAndGetType(name: string, source: string): adt.Type {
  const prog = parse(source);
  return getTypeOf(
    name,
    prog.getSourceFile("input.ts")!,
    prog.getTypeChecker()
  );
}
