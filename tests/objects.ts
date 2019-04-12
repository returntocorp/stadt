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
});
