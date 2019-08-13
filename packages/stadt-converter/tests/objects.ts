import { assert } from "chai";
import * as stadt from "stadt";
import * as util from "./util";

describe("object type handling", () => {
  it("converts the `object` nonprimitive type", () => {
    const ty = util.parseAndGetType("foo", "const foo: object = {}");
    assert.deepEqual(ty, stadt.nonPrimitiveType);
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
    assert.notEqual(ty.kind, stadt.TypeKind.Untranslated);
  });

  describe("structural types", () => {
    it("converts properties", () => {
      const ty = util.parseAndGetType("foo", 'const foo = {x: 1, y: "hello"}');
      const properties = [
        {
          name: "x",
          optional: false,
          type: stadt.numberType
        },
        {
          name: "y",
          optional: false,
          type: stadt.stringType
        }
      ];
      assert.deepEqual(ty, new stadt.ObjectType(properties));
    });
  });

  describe("nominative types", () => {
    it("lists the type of a builtin using its name", () => {
      let ty = util.parseAndGetType("foo", "const foo = new Date()");
      assert.equal(ty.kind, stadt.TypeKind.Nominative);
      assert.deepEqual(
        ty,
        new stadt.NominativeType("Date", {
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
      assert.equal(ty.kind, stadt.TypeKind.Nominative);
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
      assert.equal(ty.kind, stadt.TypeKind.Nominative);
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
      assert.equal(ty.kind, stadt.TypeKind.Nominative);
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
      assert.equal(ty.kind, stadt.TypeKind.Nominative);
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
      assert.equal(ty.kind, stadt.TypeKind.Nominative);
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
      assert.deepEqual(ty, new stadt.TypeofType("jQuery"));
    });
  });

  describe("array types", () => {
    it("infers the type of an array, including the element type", () => {
      const ty = util.parseAndGetType("foo", "const foo = [1, 2, 3]");
      assert.deepEqual(
        ty,
        new stadt.NominativeType("Array", { builtin: true, name: "Array" }, [
          stadt.numberType
        ])
      );
    });
  });

  it("interprets tuples specially", () => {
    const ty = util.parseAndGetType(
      "foo",
      "const foo: [number, string] = [1, 'two']"
    );
    assert.deepEqual(ty, new stadt.TupleType([stadt.numberType, stadt.stringType]));
  });

  describe("class objects", () => {
    it("class object is not immediately assigned", () => {
      const ty = util.parseAndGetType("foo", "class Foo {}; const foo = Foo");
      assert.deepEqual(ty, new stadt.TypeofType("Foo"));
    });
    it("class object is immediately assigned", () => {
      const ty = util.parseAndGetType("foo", "const foo = class Foo {}");
      assert.deepEqual(ty, new stadt.TypeofType("Foo"));
    });
    it("class object is immediately assigned and anonymous", () => {
      const ty = util.parseAndGetType("foo", "const foo = class {}");
      assert.deepEqual(ty, new stadt.TypeofType("__class"));
    });
  });

  describe("types with type parameters", () => {
    it("infers the type parameter of an array type", () => {
      const ty = util.parseAndGetType("foo", "const foo = [1, 2, 3]");
      assert.deepEqual(
        ty,
        new stadt.NominativeType(
          "Array",
          {
            builtin: true,
            name: "Array"
          },
          [stadt.numberType]
        )
      );
    });
  });
});
