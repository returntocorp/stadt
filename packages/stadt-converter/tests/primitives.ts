import { assert } from "chai";
import * as stadt from "stadt";
import * as util from "./util";

describe("primitive type handling", () => {
  it("should convert the type of a string variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = String(999)");
    assert.deepEqual(ty, stadt.stringType);
  });
  it("should convert the type of a number variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = Math.random()");
    assert.deepEqual(ty, stadt.numberType);
  });
  it("should convert the type of a string variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = 123 == 456");
    assert.deepEqual(ty, stadt.booleanType);
  });
  it("should convert the type of a null variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = null");
    assert.deepEqual(ty, stadt.nullType);
  });
  it("should convert the type of a variable set to undefined", () => {
    const ty = util.parseAndGetType("foo", "const foo = undefined");
    assert.deepEqual(ty, stadt.undefinedType);
  });
  it("should convert the type of a boolean variable", () => {
    const ty = util.parseAndGetType("foo", "const foo = Math.random() < 0.5");
    assert.deepEqual(ty, stadt.booleanType);
  });
  it("should convert the never type", () => {
    const ty = util.parseAndGetType(
      "foo",
      `
const array: never[] = [];
const foo = array[0];
`
    );
    assert.deepEqual(ty, stadt.neverType);
  });

  it("should convert the generic symbol type", () => {
    const ty = util.parseAndGetType("foo", "const foo: symbol = Symbol('foo')");
    assert.deepEqual(ty, stadt.symbolType);
  });

  it("should convert the unique symbol type", () => {
    const ty = util.parseAndGetType("foo", "const foo = Symbol('foo')");
    assert(ty.isUniqueSymbol());
  });
});
