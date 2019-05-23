import { assert } from "chai";
import * as stadt from "../src/index";
import * as ts from "typescript";

function roundTrip(ty: stadt.Type): stadt.Type {
  return stadt.fromJSON(ty.toJSON());
}

// Serializes and deserializes the given object, then asserts that the result is
// deeply equal to the original.
function checkRoundTrip(description: string, ty: stadt.Type) {
  it(description, () => {
    assert.deepEqual(roundTrip(ty), ty);
  });
}

describe("JSON serialization", () => {
  describe("serializing and then deserializing", () => {
    describe("primitive types", () => {
      checkRoundTrip("string type", stadt.stringType);
      checkRoundTrip("number type", stadt.numberType);
      checkRoundTrip("boolean type", stadt.booleanType);
      checkRoundTrip("null type", stadt.nullType);
      checkRoundTrip("undefined type", stadt.undefinedType);
      checkRoundTrip("void type", stadt.voidType);
      checkRoundTrip("never type", stadt.neverType);
      checkRoundTrip("any type", stadt.anyType);
      checkRoundTrip("nonprimitive type", stadt.nonPrimitiveType);
      checkRoundTrip("symbol type", stadt.symbolType);
      checkRoundTrip("unique symbol type", new stadt.UniqueSymbolType("123"));
    });

    checkRoundTrip("string literal", new stadt.LiteralType("foo bar"));
    checkRoundTrip("number literal", new stadt.LiteralType(123456));

    checkRoundTrip(
      "union type",
      new stadt.UnionType([new stadt.LiteralType("blah"), stadt.undefinedType])
    );

    checkRoundTrip(
      "tuple type",
      new stadt.TupleType([stadt.stringType, stadt.numberType])
    );

    {
      const intersectionType = new stadt.IntersectionType([
        new stadt.ObjectType([
          { name: "a", type: stadt.numberType, optional: false }
        ]),
        new stadt.ObjectType([
          { name: "b", type: stadt.stringType, optional: false }
        ])
      ]);
      checkRoundTrip("intersection type", intersectionType);
    }

    {
      const parameters = [
        { name: "x", type: stadt.stringType },
        {
          name: "y",
          type: new stadt.UnionType([stadt.stringType, stadt.numberType])
        }
      ];
      const signature: stadt.Signature = {
        parameters,
        returnType: new stadt.UnionType([stadt.nullType, stadt.undefinedType])
      };
      checkRoundTrip(
        "callable object type",
        stadt.ObjectType.newFunction([signature])
      );
    }

    describe("object types", () => {
      it("object with only required properties", () => {
        const properties = [
          {
            name: "prop",
            optional: false,
            type: stadt.stringType
          }
        ];
        const ty = new stadt.ObjectType(properties);
        assert.deepEqual(roundTrip(ty), ty);
      });

      it("object with an optional property", () => {
        const properties = [
          {
            name: "prop",
            optional: true,
            type: stadt.stringType
          }
        ];
        const ty = new stadt.ObjectType(properties);
        assert.deepEqual(roundTrip(ty), ty);
      });
    });
  });
});
