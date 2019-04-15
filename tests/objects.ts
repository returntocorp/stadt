import { assert } from "chai";
import { Converter } from "../src/index";
import * as adt from "../src/adt";
import * as ts from "typescript";
import * as util from "./util";

describe("object type handling", () => {
  describe("structural types", () => {
    it("converts properties", () => {
      const ty = util.parseAndGetType("foo", 'const foo = {x: 1, y: "hello"}');
      const properties = [
        {
          name: "x",
          optional: false,
          type: adt.numberType
        },
        {
          name: "y",
          optional: false,
          type: adt.stringType
        }
      ];
      assert.deepEqual(ty, adt.objectType({ properties }));
    });
  });

  describe("nominative types", () => {
    it("lists the type of a builtin using its name", () => {
      const ty = util.parseAndGetType("foo", "const foo = new Date()");
      assert.deepEqual(ty, adt.nominativeType("Date"));
    });

    it("lists a literal whose declared type is an interface using its name", () => {
      const ty = util.parseAndGetType(
        "foo",
        `
interface Foo = { name: string };
const foo: Foo = {name: "hello"};
`
      );
      assert.deepEqual(ty, adt.nominativeType("Foo"));
    });

    it("can handle a type with a recursive property", () => {
      const ty = util.parseAndGetType(
        "foo",
        `
interface LinkedNode {
  value: number,
  next?: LinkedNode
};
const foo: LinkedNode = { value: 123, next: {value: 456}}`
      );
      assert.deepEqual(ty, adt.nominativeType("LinkedNode"));
    });
  });
});
