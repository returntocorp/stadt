import { assert } from "chai";
import * as adt from "../src/adt";
import * as util from "./util";

describe("primitive type handling", () => {
  it("should convert the type of a string variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = String(999)");
    assert.deepEqual(ty, adt.stringType);
  });
  it("should convert the type of a number variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = Math.random()");
    assert.deepEqual(ty, adt.numberType);
  });
  it("should convert the type of a string variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = 123 == 456");
    assert.deepEqual(ty, adt.booleanType);
  });
  it("should convert the type of a null variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = null");
    assert.deepEqual(ty, adt.nullType);
  });
  it("should convert the type of a variable set to undefined", () => {
    const ty = util.parseAndGetType("foo", "const foo = undefined");
    assert.deepEqual(ty, adt.undefinedType);
  });
  it("should convert the type of a boolean variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = Math.random() < 0.5");
    assert.deepEqual(ty, adt.booleanType);
  });
  it("should convert the never type", () => {
    const ty = util.parseAndGetType(
      "foo",
      `
const array: never[] = [];
const foo = array[0];
`
    );
    assert.deepEqual(ty, adt.neverType);
  });

  it("should convert the generic symbol type", () => {
    const ty = util.parseAndGetType("foo", "const foo: symbol = Symbol('foo')");
    assert.deepEqual(ty, adt.symbolType);
  });

  it("should convert the unique symbol type", () => {
    const ty = util.parseAndGetType("foo", "const foo = Symbol('foo')");
    assert(ty.isUniqueSymbol());
  });
});
