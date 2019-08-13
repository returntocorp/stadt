// A small program that converts all types present in a single source file.
// Useful for debugging purposes.

import * as stadt from "stadt";
import * as ts from "typescript";
import * as util from "util";
import { Converter } from "./index";

function ellipsize(str: string) {
  return str.length <= 30 ? str : str.slice(0, 30) + "...";
}

// Yields all types found in the given source file and their conversions. This
// makes a weak attempt at deduplication.
function convertAll(
  host: ts.CompilerHost,
  program: ts.Program,
  sourceFile: ts.SourceFile
): { ts: ts.Type; position: number; text: string; adt: stadt.Type }[] {
  const checker = program.getTypeChecker();
  const typePairs: {
    ts: ts.Type;
    position: number;
    text: string;
    adt: stadt.Type;
  }[] = [];
  const seen: WeakSet<ts.Type> = new WeakSet();
  const converter = new Converter(host, program);
  function visit(node: ts.Node) {
    try {
      const tsType = checker.getTypeAtLocation(node);
      const sym = checker.getSymbolAtLocation(node);
      const text = sym
        ? checker.getFullyQualifiedName(sym)
        : ellipsize(node.getText().replace(/\s+/g, " "));
      // Don't add ts types that we've seen already.
      if (!seen.has(tsType)) {
        const adtType = converter.convert(tsType);
        typePairs.push({
          ts: tsType,
          position: node.pos,
          text,
          adt: adtType
        });
        seen.add(tsType);
      }
    } catch (e) {
      console.error(
        `couldn't get type of node of kind ${node.kind} pos ${node.pos}`
      );
    }
    node.forEachChild(visit);
  }
  sourceFile.forEachChild(visit);
  return typePairs;
}

if (require.main === module) {
  const fileName = process.argv[2];
  const options: ts.CompilerOptions = {
    allowJs: true,
    target: ts.ScriptTarget.ES2019,
    strict: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs
  };
  const host = ts.createCompilerHost(options);
  const program = ts.createProgram([fileName], options, host);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName)!;
  const typePairs = convertAll(host, program, sourceFile);
  for (const typePair of typePairs) {
    const tsString = checker.typeToString(typePair.ts);
    const adtString = util.inspect(typePair.adt, {
      depth: 6,
      colors: true
    });
    const indentedAdtString = adtString.replace(/^/gm, "    ");
    console.log(
      `${typePair.text} @ ${
        typePair.position
      } : ${tsString} ➡\n${indentedAdtString}\n`
    );
  }
}
