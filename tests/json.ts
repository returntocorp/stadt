import { assert } from "chai";
import { Converter } from "../src/index";
import * as adt from "../src/adt";
import * as adtJSON from "../src/adt-json";
import * as ts from "typescript";
import * as util from "./util";

function roundTrip(ty: adt.Type): adt.Type {
  return adtJSON.fromJSON(adtJSON.toJSON(ty));
}

// Serializes and deserializes the given object, then asserts that the result is
// deeply equal to the original.
function checkRoundTrip(description: string, ty: adt.Type) {
  it(description, () => {
    const roundTripped = adtJSON.fromJSON(adtJSON.toJSON(ty));
    assert.deepEqual(roundTripped, ty);
  });
}

describe("JSON serialization", () => {
  describe("serializing and then deserializing", () => {
    describe("primitive types", () => {
      checkRoundTrip("string type", adt.stringType);
      checkRoundTrip("number type", adt.numberType);
      checkRoundTrip("boolean type", adt.booleanType);
      checkRoundTrip("null type", adt.nullType);
      checkRoundTrip("undefined type", adt.undefinedType);
      checkRoundTrip("void type", adt.voidType);
      checkRoundTrip("never type", adt.neverType);
      checkRoundTrip("any type", adt.anyType);
    });

    checkRoundTrip("string literal", new adt.LiteralType("foo bar"));
    checkRoundTrip("number literal", new adt.LiteralType(123456));

    checkRoundTrip(
      "union type",
      new adt.UnionType([new adt.LiteralType("blah"), adt.undefinedType])
    );

    {
      const parameters = [
        { name: "x", type: adt.stringType },
        { name: "y", type: new adt.UnionType([adt.stringType, adt.numberType]) }
      ];
      const signature: adt.Signature = {
        parameters,
        returnType: new adt.UnionType([adt.nullType, adt.undefinedType])
      };
      checkRoundTrip(
        "callable object type",
        adt.ObjectType.newFunction([signature])
      );
    }

    describe("object types", () => {
      it("object with only required properties", () => {
        const properties = [
          {
            name: "prop",
            optional: false,
            type: adt.stringType
          }
        ];
        const ty = new adt.ObjectType(properties);
        assert.deepEqual(roundTrip(ty), ty);
      });

      it("object with an optional property", () => {
        const properties = [
          {
            name: "prop",
            optional: true,
            type: adt.stringType
          }
        ];
        const ty = new adt.ObjectType(properties);
        assert.deepEqual(roundTrip(ty), ty);
      });
    });
  });
});