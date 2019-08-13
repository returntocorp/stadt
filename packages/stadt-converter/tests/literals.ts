import { assert } from "chai";
import * as stadt from "stadt";
import * as util from "./util";

describe("literal type handling", () => {
  it("should convert a string literal type", () => {
    const ty = util.parseAndGetType("foo", "const foo = 'asdf'");
    assert.deepEqual(ty, new stadt.LiteralType("asdf"));
  });
  it("should convert a numeric literal type", () => {
    const ty = util.parseAndGetType("foo", "const foo = 168");
    assert.deepEqual(ty, new stadt.LiteralType(168));
  });
  it("should convert a boolean literal to the boolean type", () => {
    const ty = util.parseAndGetType("foo", "const foo = false");
    assert.deepEqual(ty, stadt.booleanType);
  });
});
