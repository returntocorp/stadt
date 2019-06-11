import { assert } from "chai";
import { Converter } from "../src/index";
import * as adt from "../src/adt";
import * as ts from "typescript";
import * as util from "./util";

describe("object type handling", () => {
  it("converts the `object` nonprimitive type", () => {
    const ty = util.parseAndGetType("foo", "const foo: object = {}");
    assert.deepEqual(ty, adt.nonPrimitiveType);
  });

  it("handles classes with functions that return `this`", () => {
    // Note that this *has* to be parsed as JS, since TypeScript's inference
    // engine works differently when parsing TypeScript.
    const ty = util.parseAndGetType(
      "foo",
      `
function Assertion() {
}

Assertion.prototype = {
  assert: function() {
    return this;
  },
};
const foo = new Assertion;
`,
      { isJs: true }
    );
    assert.notEqual(ty.kind, adt.TypeKind.Untranslated);
  });

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
      let ty = util.parseAndGetType("foo", "const foo = new Date()");
      assert.equal(ty.kind, adt.TypeKind.Nominative);
      assert.deepEqual(
        ty,
        new adt.NominativeType("Date", {
          builtin: true,
          name: "Date"
        })
      );
    });

    it("lists a literal whose declared type is an interface using its name", () => {
      const ty = util.parseAndGetType(
        "foo",
        `
interface Foo { name: string };
const foo: Foo = {name: "hello"};
`
      );
      assert.equal(ty.kind, adt.TypeKind.Nominative);
      assert.propertyVal(ty, "name", "Foo");
    });

    it("uses nominative serialization for prototype-style classes", () => {
      const ty = util.parseAndGetType(
        "foo",
        `
function Foo() {
  this.prop = "hello";
}

Foo.prototype.getProp = function() {
  const foo = this;
  return foo.prop;
}
`,
        { isJs: true }
      );
      assert.equal(ty.kind, adt.TypeKind.Nominative);
      assert.propertyVal(ty, "name", "Foo");
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
      assert.equal(ty.kind, adt.TypeKind.Nominative);
      assert.propertyVal(ty, "name", "LinkedNode");
    });

    it("can handle a type alias with a recursive property", () => {
      const ty = util.parseAndGetType(
        "foo",
        `
type LinkedNode = {
value: number,
next?: LinkedNode
};
const foo: LinkedNode = { value: 123, next: {value: 456}}`
      );
      assert.equal(ty.kind, adt.TypeKind.Nominative);
      assert.propertyVal(ty, "name", "LinkedNode");
    });

    it("doesn't loop when given a namespace with itself as a member", () => {
      const ty = util.parseAndGetType(
        "foo",
        `
class Outer {}

namespace Outer {
export class Inner extends Outer {}
}
const foo = Outer;
`
      );
      assert.equal(ty.kind, adt.TypeKind.Nominative);
      assert.propertyVal(ty, "name", "Outer");
    });
  });

  describe("typeof types", () => {
    it("jquery-ish", () => {
      // This is what jQuery winds up being compiled to. We want to output it as
      // `typeof jQuery` because otherwise we output the *entire* type of jQuery
      // every time it gets used, which bloats the type file to hell.
      const ty = util.parseAndGetType(
        "jQuery",
        `
const jQuery = function() {
  return {};
};
jQuery.fn = jQuery.prototype = {
  constructor: jQuery,
  init: function() {
    return this;
  },
}
`,
        { isJs: true }
      );
      assert.deepEqual(ty, new adt.TypeofType("jQuery"));
    });

    it("stringifies typeof types using the `typeof` keyword", () => {
      assert.equal(new adt.TypeofType("jQuery").toString(), "typeof jQuery");
    });
  });

  describe("array types", () => {
    it("infers the type of an array, including the element type", () => {
      const ty = util.parseAndGetType("foo", "const foo = [1, 2, 3]");
      assert.deepEqual(
        ty,
        new adt.NominativeType("Array", { builtin: true, name: "Array" }, [
          adt.numberType
        ])
      );
    });
  });

  it("interprets tuples specially", () => {
    const ty = util.parseAndGetType(
      "foo",
      "const foo: [number, string] = [1, 'two']"
    );
    assert.deepEqual(ty, new adt.TupleType([adt.numberType, adt.stringType]));
  });

  it("stringifies tuples using array-ish syntax", () => {
    const ty = util.parseAndGetType(
      "foo",
      "const foo: [number, string] = [1, 'two']"
    );
    assert.equal(ty.toString(), "[number, string]");
  });

  describe("class objects", () => {
    it("class object is not immediately assigned", () => {
      const ty = util.parseAndGetType("foo", "class Foo {}; const foo = Foo");
      assert.deepEqual(ty, new adt.TypeofType("Foo"));
    });
    it("class object is immediately assigned", () => {
      const ty = util.parseAndGetType("foo", "const foo = class Foo {}");
      assert.deepEqual(ty, new adt.TypeofType("Foo"));
    });
    it("class object is immediately assigned and anonymous", () => {
      const ty = util.parseAndGetType("foo", "const foo = class {}");
      assert.deepEqual(ty, new adt.TypeofType("__class"));
    });
  });

  describe("types with type parameters", () => {
    it("infers the type parameter of an array type", () => {
      const ty = util.parseAndGetType("foo", "const foo = [1, 2, 3]");
      assert.deepEqual(
        ty,
        new adt.NominativeType(
          "Array",
          {
            builtin: true,
            name: "Array"
          },
          [adt.numberType]
        )
      );
    });
  });

  describe("stringification", () => {
    it("stringifies generic types using <> syntax", () => {
      const ty = util.parseAndGetType(
        "foo",
        "const foo: Map<string, number> = new Map()"
      );
      assert.equal(ty.toString(), "Map<string, number>");
    });

    it("stringifies objects by listing their properties", () => {
      const ty = util.parseAndGetType("foo", "const foo = {x: 1, y: 'hello'}");
      assert.equal(ty.toString(), "{x: number; y: string}");
    });

    it("lists a single signature by itself", () => {
      const ty = util.parseAndGetType("foo", "const foo = Math.round");
      assert.equal(ty.toString(), "(x: number) => number");
    });

    it("separates multiple signatures via semicolons", () => {
      const ty = util.parseAndGetType(
        "foo",
        `
declare function func(x: number): number;
declare function func(x: string): string;
const foo = func;`
      );
      assert.equal(
        ty.toString(),
        "{(x: number) => number; (x: string) => string}"
      );
    });
  });
});
