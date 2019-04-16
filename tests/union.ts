import { assert } from "chai";
import * as adt from "../src/adt";
import * as util from "./util";

describe("union types", () => {
  it("should convert union types", () => {
    const ty = util.parseAndGetType(
      "foo",
      `
const x = Math.random();
const foo = x < 0.5 ? String(x) : x;
`
    );
    assert.deepEqual(ty, new adt.UnionType([adt.stringType, adt.numberType]));
  });
});
