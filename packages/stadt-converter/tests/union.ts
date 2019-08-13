import { assert } from "chai";
import * as stadt from "stadt";
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
    assert.deepEqual(ty, new stadt.UnionType([stadt.stringType, stadt.numberType]));
  });

  it("should convert intersection types", () => {
    const ty = util.parseAndGetType(
      "foo",
      `
const foo: {a: number} & {b: string} = {a: 3, b: 'hi'};
`
    );
    const expected = new stadt.IntersectionType([
      new stadt.ObjectType([
        { name: "a", type: stadt.numberType, optional: false }
      ]),
      new stadt.ObjectType([{ name: "b", type: stadt.stringType, optional: false }])
    ]);
    assert.deepEqual(ty, expected);
  });
});
