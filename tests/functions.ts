import { assert } from "chai";
import { Converter } from "../src/index";
import * as adt from "../src/adt";
import * as ts from "typescript";
import * as util from "./util";

describe("function type handling", () => {
  it("should convert an arrow function", () => {
    const ty = util.parseAndGetType("foo", "const foo = (x) => Number(x)");
    const sig = {
      parameters: [{ name: "x", type: adt.anyType }],
      returnType: adt.numberType
    };
    assert.deepEqual(ty, adt.ObjectType.newFunction([sig]));
  });

  it("should convert a method on a builtin", () => {
    const ty = util.parseAndGetType("foo", "const foo = Math.round");
    const sig = {
      parameters: [{ name: "x", type: adt.numberType }],
      returnType: adt.numberType
    };
    assert.deepEqual(ty, adt.ObjectType.newFunction([sig]));
  });

  it("should convert a method on a builtin that's being invoked", () => {
    const source = "(new Date()).toUTCString()";
    const { host, program, checker, sourceFile } = util.parse(source);
    const token = util.getTokenAtPosition(
      sourceFile,
      source.indexOf("toUTCString()")
    );
    const ty = checker.getTypeAtLocation(token);
    const sig = {
      parameters: [],
      returnType: adt.stringType
    };
    assert.deepEqual(
      new Converter(host, program).convert(ty),
      adt.ObjectType.newFunction([sig])
    );
  });

  describe("signature collapsing", () => {
    // Both TypeScript's DOM type declarations and its Node type declarations
    // define `console.clear` to have type `() => void`. From a static analysis
    // perspective, we don't really care about that. So we want to collapse
    // all signatures that are identical.
    it("should collapse duplicate signatures", () => {
      const source = `
declare function foo(): void;
declare function foo(): void;
`;
      const { checker, host, program, sourceFile } = util.parse(source);
      const token = util.getTokenAtPosition(sourceFile, source.indexOf("foo"));
      const ty = new Converter(host, program).convert(
        checker.getTypeAtLocation(token)
      );
      assert(ty.isObject());
      assert.lengthOf((ty as adt.ObjectType).callSignatures, 1);
    });

    it("should collapse signatures that differ only in parameter names", () => {
      const source = `
declare function foo(x: number): void;
declare function foo(y: number): void;
`;
      const { checker, host, program, sourceFile } = util.parse(source);
      const token = util.getTokenAtPosition(sourceFile, source.indexOf("foo"));
      const ty = new Converter(host, program).convert(
        checker.getTypeAtLocation(token)
      );
      assert(ty.isObject());
      assert.lengthOf((ty as adt.ObjectType).callSignatures, 1);
    });

    it("should not collapse signatures with different argument types", () => {
      const source = `
declare function foo(x: number): void;
declare function foo(x: string): void;
`;
      const { checker, host, program, sourceFile } = util.parse(source);
      const token = util.getTokenAtPosition(sourceFile, source.indexOf("foo"));
      const ty = new Converter(host, program).convert(
        checker.getTypeAtLocation(token)
      );
      assert(ty.isObject());
      assert.lengthOf((ty as adt.ObjectType).callSignatures, 2);
    });

    it("should not collapse signatures with different return types", () => {
      const source = `
declare function foo(x: number): void;
declare function foo(x: number): any;
`;
      const { checker, host, program, sourceFile } = util.parse(source);
      const token = util.getTokenAtPosition(sourceFile, source.indexOf("foo"));
      const ty = new Converter(host, program).convert(
        checker.getTypeAtLocation(token)
      );
      assert(ty.isObject());
      assert.lengthOf((ty as adt.ObjectType).callSignatures, 2);
    });
  });
});
