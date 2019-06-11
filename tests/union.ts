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

  it("should convert intersection types", () => {
    const ty = util.parseAndGetType(
      "foo",
      `
const foo: {a: number} & {b: string} = {a: 3, b: 'hi'};
`
    );
    const expected = new adt.IntersectionType([
      new adt.ObjectType([
        { name: "a", type: adt.numberType, optional: false }
      ]),
      new adt.ObjectType([{ name: "b", type: adt.stringType, optional: false }])
    ]);
    assert.deepEqual(ty, expected);
  });

  it("stringifies union types by separating them with |", () => {
    const ty = new adt.UnionType([adt.numberType, adt.stringType]);
    assert.equal(ty.toString(), "number | string");
  });

  it("stringifies intersection types by separating them with &", () => {
    const ty = new adt.IntersectionType([adt.booleanType, adt.symbolType]);
    assert.equal(ty.toString(), "boolean & Symbol");
  });
});
