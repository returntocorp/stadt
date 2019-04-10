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
    assert.deepEqual(ty, adt.functionType([sig]));
  });

  it("should convert a method on a builtin", () => {
    const ty = util.parseAndGetType("foo", "const foo = Math.round");
    const sig = {
      parameters: [{ name: "x", type: adt.numberType }],
      returnType: adt.numberType
    };
    assert.deepEqual(ty, adt.functionType([sig]));
  });

  it("should convert a method on a builtin that's being invoked", () => {
    const source = "(new Date()).toUTCString()";
    const { checker, sourceFile } = util.parse(source);
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
      new Converter(checker).convert(ty),
      adt.functionType([sig])
    );
  });
});
