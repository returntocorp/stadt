import { assert } from "chai";
import * as adt from "../src/adt";

describe("mustSatisfy", () => {
  it("simply calls the function on non-union/non-intersection types", () => {
    const ty = new adt.LiteralType("foo");
    assert(ty.mustSatisfy(t => t === ty));
  });

  it("returns true if all members of a union satisfy the predicate", () => {
    const ty = new adt.UnionType([
      new adt.LiteralType("foo"),
      new adt.LiteralType("bar")
    ]);
    assert(ty.mustSatisfy(t => t.isLiteral()));
  });

  it("returns false if a single union member doesn't satisfy the predicate", () => {
    const ty = new adt.UnionType([new adt.LiteralType("foo"), adt.booleanType]);
    assert(!ty.mustSatisfy(t => t.isLiteral()));
  });

  it("returns true if a single intersection member satisfies the predicate", () => {
    const ty = new adt.IntersectionType([
      new adt.LiteralType("foo"),
      adt.booleanType
    ]);
    assert(ty.mustSatisfy(t => t.isLiteral()));
  });

  it("returns false if no intersection member satisfies the predicate", () => {
    const ty = new adt.IntersectionType([
      new adt.LiteralType("foo"),
      adt.booleanType
    ]);
    assert(!ty.mustSatisfy(t => t.isNull()));
  });

  it("can handle a nested tree", () => {
    // This type doesn't actually make sense, but oh well.
    const ty = new adt.UnionType([
      new adt.IntersectionType([adt.numberType, adt.symbolType]),
      new adt.IntersectionType([new adt.LiteralType(123), adt.undefinedType])
    ]);
    assert(ty.mustSatisfy(t => t.isNumber()));
  });
});
