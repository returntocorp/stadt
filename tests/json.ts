import { assert } from "chai";
import { Converter } from "../src/index";
import * as adt from "../src/adt";
import * as adtJSON from "../src/adt-json";
import * as ts from "typescript";
import * as util from "./util";

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
      checkRoundTrip("any type", adt.anyType);
    });

    checkRoundTrip("string literal", adt.stringLiteralType("foo bar"));
    checkRoundTrip("number literal", adt.numberLiteralType(123456));

    checkRoundTrip(
      "union type",
      adt.unionType([adt.stringLiteralType("blah"), adt.undefinedType])
    );

    {
      const parameters = [
        { name: "x", type: adt.stringType },
        { name: "y", type: adt.unionType([adt.stringType, adt.numberType]) }
      ];
      const signature: adt.Signature = {
        parameters,
        returnType: adt.unionType([adt.nullType, adt.undefinedType])
      };
      checkRoundTrip("callable object type", adt.functionType([signature]));
    }
  });
});
