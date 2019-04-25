import * as adt from "./adt";
import * as ts from "typescript";
import * as path from "path";
import * as deepEqual from "fast-deep-equal";

export * from "./adt";
export * from "./adt-json";

export class Converter {
  private readonly host: ts.CompilerHost;
  private readonly program: ts.Program;
  private readonly checker: ts.TypeChecker;
  private readonly sourceRoot: string | undefined;
  private readonly cache: WeakMap<ts.Type, adt.Type>;
  // sourceRoot is the root directory of all source files of the code itself (as
  // opposed to dependencies). It's used for relative-izing file names in fully
  // qualified names. If not set, all paths are absolute.
  constructor(host: ts.CompilerHost, program: ts.Program, sourceRoot?: string) {
    this.host = host;
    this.program = program;
    this.checker = program.getTypeChecker();
    this.sourceRoot = sourceRoot;
    this.cache = new WeakMap();
  }

  public convert(tsType: ts.Type): adt.Type {
    if (!this.cache.has(tsType)) {
      this.cache.set(tsType, this.convertWithoutCache(tsType));
    }
    return this.cache.get(tsType)!;
  }

  private convertWithoutCache(tsType: ts.Type): adt.Type {
    // Primitive types.
    if (tsType.flags & ts.TypeFlags.String) {
      return adt.stringType;
    } else if (tsType.flags & ts.TypeFlags.Number) {
      return adt.numberType;
    } else if (
      tsType.flags &
      (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)
    ) {
      return adt.booleanType;
    } else if (tsType.flags & ts.TypeFlags.ESSymbol) {
      return adt.symbolType;
    } else if (tsType.flags & ts.TypeFlags.UniqueESSymbol) {
      const { escapedName } = tsType as ts.UniqueESSymbolType;
      return new adt.UniqueSymbolType(
        ts.unescapeLeadingUnderscores(escapedName)
      );
    } else if (tsType.flags & ts.TypeFlags.Null) {
      return adt.nullType;
    } else if (tsType.flags & ts.TypeFlags.Undefined) {
      return adt.undefinedType;
    } else if (tsType.flags & ts.TypeFlags.Void) {
      return adt.voidType;
    } else if (tsType.flags & ts.TypeFlags.Never) {
      return adt.neverType;
    } else if (tsType.flags & ts.TypeFlags.Any) {
      return adt.anyType;
    } else if (tsType.flags & ts.TypeFlags.NonPrimitive) {
      return adt.nonPrimitiveType;
    } else if (tsType.isStringLiteral()) {
      return new adt.LiteralType(tsType.value);
    } else if (tsType.isNumberLiteral()) {
      return new adt.LiteralType(tsType.value);
    } else if (tsType.isUnion()) {
      return new adt.UnionType(tsType.types.map(ty => this.convert(ty)));
    } else if (tsType.isIntersection()) {
      return new adt.IntersectionType(tsType.types.map(ty => this.convert(ty)));
    } else if (tsType.flags & ts.TypeFlags.Object) {
      return this.convertObject(tsType as ts.ObjectType);
    } else if (tsType.isTypeParameter()) {
      return new adt.TypeParameterType(tsType.symbol.name);
    }
    return this.untranslated(tsType);
  }

  public typeDefinition(tsType: ts.ObjectType): adt.ObjectType {
    const properties: adt.Property[] = this.checker
      .getPropertiesOfType(tsType)
      .map(prop => {
        const tsType = this.checker.getTypeOfSymbolAtLocation(
          prop,
          prop.valueDeclaration
        );
        const optional = (prop.flags & ts.SymbolFlags.Optional) != 0;
        return {
          name: prop.name,
          optional,
          type: this.convert(tsType)
        };
      });
    const tsSignatures = this.checker.getSignaturesOfType(
      tsType,
      ts.SignatureKind.Call
    );
    let callSignatures: adt.Signature[] | undefined;
    if (tsSignatures.length) {
      callSignatures = tsSignatures.map(sig => this.convertSignature(sig));
      if (callSignatures.length < 10) {
        callSignatures = collapseSignatures(callSignatures);
      }
    }
    return new adt.ObjectType(properties, callSignatures);
  }

  private convertObject(tsType: ts.ObjectType): adt.Type {
    const asNominativeType = this.asNominativeType(tsType);
    if (asNominativeType) {
      return asNominativeType;
    }
    const asTypeofType = this.asTypeofType(tsType);
    if (asTypeofType) {
      return asTypeofType;
    }
    if (isTupleType(tsType)) {
      return new adt.TupleType(
        tsType.typeArguments!.map(ty => this.convert(ty))
      );
    }
    return this.typeDefinition(tsType);
  }

  // Constructs a type without even trying to translate it. This is public so
  // that if `convert` throws due to a stack overflow or something, the caller
  // can catch and then fall back to this method.
  public untranslated(tsType: ts.Type): adt.UntranslatedType {
    return new adt.UntranslatedType(this.checker.typeToString(tsType));
  }

  private convertSignature(tsSignature: ts.Signature): adt.Signature {
    const parameters = tsSignature.parameters.map(parameter => {
      // TODO: Can we distinguish optional parameters here? It's legal to pass
      // `undefined` in place of an optional parameter, but that doesn't show up
      // in tsParamType here.
      const tsParamType = this.checker.getTypeOfSymbolAtLocation(
        parameter,
        parameter.valueDeclaration
      );
      return {
        name: parameter.name,
        type: this.convert(tsParamType)
      };
    });
    const returnType = this.convert(
      this.checker.getReturnTypeOfSignature(tsSignature)
    );
    return {
      parameters,
      returnType
    };
  }

  // If this should be converted as a 'typeof type', returns that.
  private asTypeofType(tsType: ts.ObjectType): adt.TypeofType | undefined {
    const symbol = tsType.symbol;
    if (!symbol) {
      return;
    }
    if (symbol.flags & ts.SymbolFlags.Class) {
      // It's a constructor.
      return new adt.TypeofType(symbol.getName());
    }
  }

  // If this type has a name that we should use to reference it by, returns the
  // appropriate nominative type.
  private asNominativeType(
    tsType: ts.ObjectType
  ): adt.NominativeType | undefined {
    if (tsType.aliasSymbol) {
      const name = tsType.aliasSymbol.getName();
      const typeArguments = tsType.aliasTypeArguments || [];
      return new adt.NominativeType(
        name,
        this.fullyQualifiedName(tsType.aliasSymbol),
        typeArguments.map(ty => this.convert(ty))
      );
    }
    const symbol = tsType.getSymbol();
    if (!symbol) {
      return undefined;
    }
    if (
      !tsType.isClassOrInterface() &&
      !(tsType.objectFlags & ts.ObjectFlags.Reference) &&
      !(symbol.flags & ts.SymbolFlags.ValueModule)
    ) {
      return undefined;
    }
    const name = symbol.getName();
    const typeArguments = hasTypeArguments(tsType) ? tsType.typeArguments : [];
    return new adt.NominativeType(
      name,
      this.fullyQualifiedName(symbol),
      typeArguments.map(ty => this.convert(ty))
    );
  }

  // Gets the fully qualified name of a symbol. This consists of the package
  // that the symbol was defined in (which can either be local to the project or
  // a dependency), the filename of its declaration, and the name of the symbol
  // within that module. The same symbol is always guaranteed to have the same
  // fully qualified name within a project, but different symbols might have the
  // same fully qualified name because uniqueness is hard (consider classes
  // returned by a function that generates classes).
  private fullyQualifiedName(
    symbol: ts.Symbol
  ): {
    builtin: boolean;
    packageName: string | undefined;
    fileName: string | undefined;
    name: string;
  } {
    const declaration = symbol.declarations[0];
    const declarationFile = declaration.getSourceFile();
    const { resolvedModule } = ts.resolveModuleName(
      stripExtension(declarationFile.fileName),
      "",
      this.program.getCompilerOptions(),
      this.host
    );
    let packageName: string | undefined;
    let fileName: string | undefined;
    const builtin = isTypeDefinitionForBuiltins(declarationFile.fileName);
    if (!builtin) {
      if (resolvedModule && resolvedModule.packageId) {
        packageName = resolvedModule.packageId.name;
        fileName = resolvedModule.packageId.subModuleName;
      } else {
        // This is either a module inside the project itself, or it's some really
        // weird thing outside the scope of module resolution. Try to guess.
        fileName = this.relativeToSourceRoot(declarationFile.fileName);
      }
    }

    return {
      builtin,
      packageName,
      fileName,
      name: symbol.getName()
    };
  }

  // If fileName is in a subdirectory of this.sourceRoot, returns the relative
  // path. Otherwise, returns fileName.
  private relativeToSourceRoot(fileName: string): string {
    if (!this.sourceRoot) {
      return fileName;
    }
    const relative = path.relative(this.sourceRoot, fileName);
    if (relative.startsWith(".." + path.sep) || relative == "..") {
      return fileName;
    } else {
      return relative;
    }
  }
}

// Removes duplicate signatures. Signatures are duplicate if they only differ in
// parameter names. NOTE: the algorithm used is O(n^2).
function collapseSignatures(signatures: adt.Signature[]): adt.Signature[] {
  if (signatures.length < 2) {
    return signatures;
  }
  const collapsed = [signatures[0]];
  for (let i = 1; i < signatures.length; i++) {
    if (
      collapsed.every(sig => !signaturesShouldBeCollapsed(sig, signatures[i]))
    ) {
      collapsed.push(signatures[i]);
    }
  }
  return collapsed;
}

// Returns true if the two signatures are identical for our purposes. Two
// signatures are identical if they only differ in parameter names.
function signaturesShouldBeCollapsed(sigA: adt.Signature, sigB: adt.Signature) {
  if (sigA.parameters.length != sigB.parameters.length) {
    return false;
  }
  if (!deepEqual(sigA.returnType, sigB.returnType)) {
    return false;
  }
  for (let i = 0; i < sigA.parameters.length; i++) {
    if (!deepEqual(sigA.parameters[i].type, sigB.parameters[i].type)) {
      return false;
    }
  }
  return true;
}

function hasTypeArguments(
  tsType: ts.Type
): tsType is ts.TypeReference & { typeArguments: ReadonlyArray<ts.Type> } {
  return (tsType as any).typeArguments;
}

function isTupleType(tsType: ts.Type): tsType is ts.TupleType {
  return (
    hasTypeArguments(tsType) &&
    Boolean(tsType.target.objectFlags & ts.ObjectFlags.Tuple)
  );
}

// Removes all known TypeScript extensions from a file.
function stripExtension(fileName: string): string {
  // .d.ts has to be first so we check it before .ts
  for (const extension of [
    ts.Extension.Dts,
    ts.Extension.Ts,
    ts.Extension.Js,
    ts.Extension.Jsx,
    ts.Extension.Tsx
  ]) {
    if (fileName.endsWith(extension)) {
      return fileName.slice(0, -extension.length);
    }
  }
  return fileName;
}

// Returns true if the type definition path (i.e., a .d.ts file) points to one
// of TypeScript's definitions for builtins.
function isTypeDefinitionForBuiltins(fileName: string): boolean {
  const dir = path.dirname(fileName);
  const parentDir = path.dirname(dir);
  return (
    path.basename(parentDir) === "typescript" && path.basename(dir) === "lib"
  );
}
