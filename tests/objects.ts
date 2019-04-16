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
      assert.deepEqual(ty, new adt.ObjectType(properties));
    });
  });

  describe("nominative types", () => {
    it("lists the type of a builtin using its name", () => {
      const ty = util.parseAndGetType("foo", "const foo = new Date()");
      assert.deepEqual(ty, new adt.NominativeType("Date"));
    });

    it("lists a literal whose declared type is an interface using its name", () => {
      const ty = util.parseAndGetType(
        "foo",
        `
interface Foo = { name: string };
const foo: Foo = {name: "hello"};
`
      );
      assert.deepEqual(ty, new adt.NominativeType("Foo"));
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
      assert.deepEqual(ty, new adt.NominativeType("LinkedNode"));
    });
  });

  describe("array types", () => {
    it("infers the type of an array, including the element type", () => {
      const ty = util.parseAndGetType("foo", "const foo = [1, 2, 3]");
      assert.deepEqual(ty, new adt.NominativeType("Array", [adt.numberType]));
    });
  });
});
