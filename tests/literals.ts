import { assert } from "chai";
import * as adt from "../src/adt";
import * as util from "./util";

describe("literal type handling", () => {
  it("should convert a string literal type", () => {
    const ty = util.parseAndGetType("foo", "const foo = 'asdf'");
    assert.deepEqual(ty, adt.stringLiteralType("asdf"));
  });
  it("should convert a numeric literal type", () => {
    const ty = util.parseAndGetType("foo", "const foo = 168");
    assert.deepEqual(ty, adt.numberLiteralType(168));
  });
  it("should convert a boolean literal to the boolean type", () => {
    const ty = util.parseAndGetType("foo", "const foo = false");
    assert.deepEqual(ty, adt.booleanType);
  });
});
