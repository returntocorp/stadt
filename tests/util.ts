import * as adt from "../src/adt";
import { Converter } from "../src/index";
import * as ts from "typescript";
// Parses the given string as source code.
export function parse(
  source: string,
  options: { isJs: boolean } = { isJs: false }
): {
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
  host: ts.CompilerHost;
  program: ts.Program;
} {
  const compilerOptions: ts.CompilerOptions = {
    allowJs: true,
    target: ts.ScriptTarget.ES2019,
    strict: true
  };
  const inputFileName = options.isJs ? "input.js" : "input.ts";
  const sourceFile = ts.createSourceFile(
    inputFileName,
    source,
    ts.ScriptTarget.ES2019
  );
  const originalHost = ts.createCompilerHost(compilerOptions);
  const inMemoryHost: ts.CompilerHost = {
    ...originalHost,
    getSourceFile(fileName, languageVersion) {
      return fileName === inputFileName
        ? sourceFile
        : originalHost.getSourceFile(fileName, languageVersion);
    },
    writeFile(_name, _text) {}
  };
  const program = ts.createProgram(
    [inputFileName],
    compilerOptions,
    inMemoryHost
  );
  return {
    checker: program.getTypeChecker(),
    sourceFile: program.getSourceFile(inputFileName)!,
    host: inMemoryHost,
    program
  };
}

// Parses the given source code, returning the type of the declared variable with the given name.
export function parseAndGetType(
  name: string,
  source: string,
  options?: { isJs: boolean }
): adt.Type {
  const { checker, sourceFile, host, program } = parse(source, options);
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
    return new Converter(host, program).convert(ty);
  } else {
    throw new Error("Failed to find node with the proper name");
  }
}

export function getTokenAtPosition(
  file: ts.SourceFile,
  position: number
): ts.Node {
  // This is an internal API but reimplementing it would require doing fiddly
  // tree-traversal work.
  return (ts as any).getTokenAtPosition(file, position);
}
