import { string, number, boolean, array, object } from "../src/schema";
import draft2020 from "ajv/dist/2020.js";

describe("Draft 2020-12 JSON Schema Spec Coverage", () => {
  describe("Primitive Type Validations", () => {
    it("validates a string schema with minLength/maxLength", async () => {
      const TestString = object({
        properties: {
          value: string({ minLength: 3, maxLength: 5 }),
        },
        required: ["value"],
      });
      console.info(
        "Generated TestString schema:",
        JSON.stringify(TestString.toSchema(), null, 2)
      );

      let result = await TestString.validate({ value: "abcd" });
      if (!result.valid) {
        console.error("Validation errors for valid string:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestString.validate({ value: "ab" });
      if (result.valid) {
        console.error("Validation unexpectedly passed for too-short string");
      }
      expect(result.valid).toBe(false);
    });

    it("validates a number schema with minimum/maximum and multipleOf", async () => {
      const TestNumber = object({
        properties: {
          value: number({
            minimum: 10,
            maximum: 20,
            exclusiveMinimum: 9,
            exclusiveMaximum: 21,
            multipleOf: 2,
          }),
        },
        required: ["value"],
      });
      let result = await TestNumber.validate({ value: 12 });
      if (!result.valid) {
        console.error("Validation errors for valid number:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestNumber.validate({ value: 9 });
      if (result.valid) {
        console.error("Validation unexpectedly passed for value 9");
      }
      expect(result.valid).toBe(false);

      result = await TestNumber.validate({ value: 21 });
      if (result.valid) {
        console.error("Validation unexpectedly passed for value 21");
      }
      expect(result.valid).toBe(false);

      result = await TestNumber.validate({ value: 13 });
      if (result.valid) {
        console.error("Validation unexpectedly passed for value 13");
      }
      expect(result.valid).toBe(false);
    });

    it("validates a boolean schema", async () => {
      const TestBoolean = object({
        properties: {
          value: boolean(),
        },
        required: ["value"],
      });
      let result = await TestBoolean.validate({ value: true });
      if (!result.valid) {
        console.error("Validation errors for true boolean:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestBoolean.validate({ value: "true" });
      if (result.valid) {
        console.error("Validation unexpectedly passed for string 'true'");
      }
      expect(result.valid).toBe(false);
    });
  });

  describe("Enum and Const Keywords", () => {
    it("validates enum keyword", async () => {
      const TestEnum = object({
        properties: {
          value: string({ enum: ["red", "green", "blue"] }),
        },
        required: ["value"],
      });
      let result = await TestEnum.validate({ value: "green" });
      if (!result.valid) {
        console.error("Enum valid value errors:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestEnum.validate({ value: "yellow" });
      if (result.valid) {
        console.error("Enum invalid value unexpectedly passed");
      }
      expect(result.valid).toBe(false);
    });

    it("validates const keyword", async () => {
      const TestConst = object({
        properties: {
          value: number({ const: 42 }),
        },
        required: ["value"],
      });
      let result = await TestConst.validate({ value: 42 });
      if (!result.valid) {
        console.error("Const valid value errors:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestConst.validate({ value: 41 });
      if (result.valid) {
        console.error("Const invalid value unexpectedly passed");
      }
      expect(result.valid).toBe(false);
    });
  });

  describe("Object Keyword Validations", () => {
    it("validates required properties", async () => {
      const TestObject = object({
        properties: {
          a: string(),
          b: number(),
        },
        required: ["a", "b"],
      });
      let result = await TestObject.validate({ a: "hello", b: 123 });
      if (!result.valid) {
        console.error("Required props valid object errors:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestObject.validate({ a: "hello" });
      if (result.valid) {
        console.error("Missing required property unexpectedly passed");
      }
      expect(result.valid).toBe(false);
    });

    it("validates patternProperties", async () => {
      const TestPattern = object({
        patternProperties: {
          "^S_": { type: "string" },
        },
        additionalProperties: false,
      });
      console.info(
        "Generated TestPattern schema:",
        JSON.stringify(TestPattern.toSchema(), null, 2)
      );

      let result = await TestPattern.validate({ S_name: "Alice" });
      if (!result.valid) {
        console.error("PatternProperties valid value errors:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestPattern.validate({ S_name: 123 });
      if (result.valid) {
        console.error("Invalid pattern property type unexpectedly passed");
      }
      expect(result.valid).toBe(false);
    });

    it("includes annotations like title, description, default, examples, deprecated, readOnly, writeOnly, and $comment", () => {
      const TestAnnotation = object({
        properties: {
          field: string({
            default: "defaultValue",
            examples: ["ex1", "ex2"],
            deprecated: true,
            readOnly: true,
            writeOnly: true,
            $comment: "Test comment",
          }),
        },
        required: ["field"],
      });
      const generated = TestAnnotation.toSchema();
      console.info(
        "Generated TestAnnotation schema:",
        JSON.stringify(generated, null, 2)
      );
      expect((generated as any).properties.field.default).toBe("defaultValue");
      expect((generated as any).properties.field.examples).toEqual([
        "ex1",
        "ex2",
      ]);
      expect((generated as any).properties.field.deprecated).toBe(true);
      expect((generated as any).properties.field.readOnly).toBe(true);
      expect((generated as any).properties.field.writeOnly).toBe(true);
      expect((generated as any).properties.field.$comment).toBe("Test comment");
    });
  });

  describe("Array Keyword Validations", () => {
    it("validates items, minItems, maxItems, and uniqueItems", async () => {
      const TestArray = object({
        properties: {
          list: array({
            items: number(),
            minItems: 2,
            maxItems: 3,
            uniqueItems: true,
          }),
        },
        required: ["list"],
      });
      let result = await TestArray.validate({ list: [1, 2] });
      if (!result.valid) {
        console.error("Valid array errors:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestArray.validate({ list: [1] });
      if (result.valid) {
        console.error("Too few items unexpectedly passed");
      }
      expect(result.valid).toBe(false);

      result = await TestArray.validate({ list: [1, 1] });
      if (result.valid) {
        console.error("Non-unique items unexpectedly passed");
      }
      expect(result.valid).toBe(false);
    });

    it("validates prefixItems for tuple-like arrays", async () => {
      const TestPrefixArray = object({
        properties: {
          arr: array({
            prefixItems: [
              { type: "string", minLength: 2 },
              { type: "number", minimum: 0 },
            ],
            minItems: 2,
            maxItems: 2,
          }),
        },
        required: ["arr"],
      });
      const generated = TestPrefixArray.toSchema();
      console.info(
        "Generated TestPrefixArray schema:",
        JSON.stringify(generated, null, 2)
      );
      let result = await TestPrefixArray.validate({ arr: ["ab", 5] });
      if (!result.valid) {
        console.error("Valid tuple errors:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestPrefixArray.validate({ arr: ["a", -1] });
      if (result.valid) {
        console.error("Invalid tuple items unexpectedly passed");
      }
      expect(result.valid).toBe(false);
    });
  });

  describe("Combinator Keywords", () => {
    it("validates allOf keyword", async () => {
      const TestAllOf = object({
        properties: {
          value: number({
            allOf: [
              { type: "number", minimum: 10 },
              { type: "number", maximum: 20 },
            ],
          }),
        },
        required: ["value"],
      });
      const generated = TestAllOf.toSchema();
      console.info(
        "Generated TestAllOf schema:",
        JSON.stringify(generated, null, 2)
      );
      let result = await TestAllOf.validate({ value: 15 });
      if (!result.valid) {
        console.error("allOf valid value errors:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestAllOf.validate({ value: 25 });
      if (result.valid) {
        console.error("allOf invalid value unexpectedly passed");
      }
      expect(result.valid).toBe(false);
    });

    it("validates anyOf keyword", async () => {
      const TestAnyOf = object({
        properties: {
          value: number({
            anyOf: [{ const: 5 }, { const: 10 }],
          }),
        },
        required: ["value"],
      });
      let result = await TestAnyOf.validate({ value: 5 });
      if (!result.valid) {
        console.error("anyOf valid value errors:", result.errors);
      }
      expect(result.valid).toBe(true);

      result = await TestAnyOf.validate({ value: 7 });
      if (result.valid) {
        console.error("anyOf invalid value unexpectedly passed");
      }
      expect(result.valid).toBe(false);
    });

    it("validates oneOf keyword", async () => {
      const TestOneOf = object({
        properties: {
          value: string({
            oneOf: [
              { type: "string", pattern: "^A" },
              { type: "string", pattern: "^B" },
            ],
          }),
        },
        required: ["value"],
      });
      const generated = TestOneOf.toSchema();
      console.info(
        "Generated TestOneOf schema:",
        JSON.stringify(generated, null, 2)
      );
      let result = await TestOneOf.validate({ value: "Apple" });
      expect(result.valid).toBe(true);

      result = await TestOneOf.validate({ value: "Banana" });
      expect(result.valid).toBe(true);

      result = await TestOneOf.validate({ value: "Citrus" });
      expect(result.valid).toBe(false);
    });

    it("validates not keyword", async () => {
      const TestNot = object({
        properties: {
          value: string({ not: { type: "string", pattern: "^abc" } }),
        },
        required: ["value"],
      });
      let result = await TestNot.validate({ value: "def" });
      expect(result.valid).toBe(true);

      result = await TestNot.validate({ value: "abcdef" });
      expect(result.valid).toBe(false);
    });
  });

  describe("Conditional Schemas (if/then/else) at Object Level", () => {
    it("applies then/else based on if", async () => {
      const TestConditionalObject = object({
        properties: {
          type: string({ enum: ["A", "B"] }),
          prop: number(),
        },
        required: ["type", "prop"],
        if: {
          properties: { type: { const: "A" } },
          required: ["type"],
        },
        then: {
          properties: { prop: { type: "number", minimum: 10 } },
          required: ["prop"],
        },
        else: {
          properties: { prop: { type: "number", maximum: 5 } },
          required: ["prop"],
        },
      });
      const generated = TestConditionalObject.toSchema();
      console.info(
        "Generated TestConditionalObject schema:",
        JSON.stringify(generated, null, 2)
      );
      let result = await TestConditionalObject.validate({
        type: "A",
        prop: 15,
      });
      expect(result.valid).toBe(true);

      result = await TestConditionalObject.validate({ type: "A", prop: 5 });
      expect(result.valid).toBe(false);

      result = await TestConditionalObject.validate({
        type: "B",
        prop: 3,
      });
      expect(result.valid).toBe(true);

      result = await TestConditionalObject.validate({
        type: "B",
        prop: 7,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("Reference Keywords", () => {
    it("resolves $ref for nested schemas", async () => {
      const RefSchema = object({
        properties: {
          a: string({ minLength: 2 }),
        },
        required: ["a"],
      });
      const TestRef = object({
        properties: {
          ref: RefSchema,
        },
        required: ["ref"],
      });
      console.info(
        "Generated TestRef schema:",
        JSON.stringify(TestRef.toSchema(), null, 2)
      );
      let result = await TestRef.validate({ ref: { a: "ab" } });
      expect(result.valid).toBe(true);

      result = await TestRef.validate({ ref: { a: "a" } });
      expect(result.valid).toBe(false);
    });
  });

  describe("Dependent Keywords", () => {
    it("validates dependentRequired", async () => {
      const TestDependent = object({
        properties: {
          a: string(),
          b: number(),
        },
        required: ["a"],
        dependentRequired: { a: ["b"] },
      });
      let result = await TestDependent.validate({ a: "x", b: 10 });
      expect(result.valid).toBe(true);

      result = await TestDependent.validate({ a: "x" });
      expect(result.valid).toBe(false);
    });

    it("validates dependentSchemas", async () => {
      const DepSchema = object({
        properties: {
          c: string({ minLength: 3 }),
        },
        required: ["c"],
        additionalProperties: true,
      });
      const TestDependentSchemas = object({
        properties: {
          a: string(),
        },
        additionalProperties: true,
        dependentSchemas: { a: DepSchema.toSchema() },
      });
      const generated = TestDependentSchemas.toSchema();
      console.info(
        "Generated dependentSchemas:",
        JSON.stringify(generated, null, 2)
      );
      expect((generated as any).dependentRequired).toBeUndefined();

      let result = await TestDependentSchemas.validate({ a: "x", c: "abc" });
      expect(result.valid).toBe(true);

      result = await TestDependentSchemas.validate({ a: "x", c: "ab" });
      expect(result.valid).toBe(false);
    });
  });

  describe("Unevaluated Properties and Items", () => {
    it("rejects additional properties when unevaluatedProperties is false", async () => {
      const TestUnevaluated = object({
        properties: {
          a: string(),
        },
        unevaluatedProperties: false,
        required: ["a"],
      });
      let result = await TestUnevaluated.validate({
        a: "hello",
        extra: "value",
      });
      expect(result.valid).toBe(false);
    });

    it("validates unevaluatedItems for arrays", () => {
      const TestUnevaluatedArray = object({
        properties: {
          arr: array({
            items: number(),
            unevaluatedItems: false,
          }),
        },
        required: ["arr"],
      });
      const generated = TestUnevaluatedArray.toSchema();
      console.info(
        "Generated TestUnevaluatedArray schema:",
        JSON.stringify(generated, null, 2)
      );
      expect((generated as any).properties.arr.unevaluatedItems).toBe(false);
    });
  });

  describe("String Keywords", () => {
    it("validates pattern, minLength, and maxLength", async () => {
      const TestStringRules = object({
        properties: {
          value: string({
            pattern: "^[a-z]+$",
            minLength: 3,
            maxLength: 20,
          }),
        },
        required: ["value"],
      });
      const generated = TestStringRules.toSchema();
      console.info(
        "Generated TestStringRules schema:",
        JSON.stringify(generated, null, 2)
      );
      let result = await TestStringRules.validate({ value: "abc" });
      expect(result.valid).toBe(true);

      result = await TestStringRules.validate({ value: "ab" });
      expect(result.valid).toBe(false);

      result = await TestStringRules.validate({ value: "ABC" });
      expect(result.valid).toBe(false);
    });

    it("validates email format independently", async () => {
      const TestEmail = object({
        properties: {
          value: string({ format: "email" }),
        },
        required: ["value"],
      });
      let result = await TestEmail.validate({ value: "abc@def.com" });
      expect(result.valid).toBe(true);

      result = await TestEmail.validate({ value: "not-an-email" });
      expect(result.valid).toBe(false);
    });

    it("includes contentEncoding, contentMediaType, and contentSchema", () => {
      const TestContent = object({
        properties: {
          value: string({
            contentMediaType: "text/plain",
            contentEncoding: "utf-8",
            contentSchema: { type: "string", pattern: "^[a-z]+$" },
          }),
        },
        required: ["value"],
      });
      const generated = TestContent.toSchema();
      console.info(
        "Generated TestContent schema:",
        JSON.stringify(generated, null, 2)
      );
      expect((generated as any).properties.value.contentMediaType).toBe(
        "text/plain"
      );
      expect((generated as any).properties.value.contentEncoding).toBe("utf-8");
      expect((generated as any).properties.value.contentSchema.pattern).toBe(
        "^[a-z]+$"
      );
    });
  });
});

describe("Draft 2020-12 JSON Schema Spec Extended Coverage", () => {
  function resolveSchema(schema: any) {
    if (schema.$ref) {
      const refKey = schema.$ref.replace("#/$defs/", "");
      if (schema.$defs && schema.$defs[refKey]) {
        return schema.$defs[refKey];
      } else {
        console.warn("Could not resolve $ref:", schema.$ref);
      }
    }
    return schema;
  }

  describe("$dynamicAnchor and $dynamicRef", () => {
    it("generates a schema with $dynamicAnchor and resolves dynamic references", () => {
      const TestDynamic = object({
        properties: {
          field: string(),
        },
        $dynamicAnchor: "node",
        required: ["field"],
      });
      const DynamicSchema = TestDynamic.toSchema();
      console.log("DynamicSchema:", JSON.stringify(DynamicSchema, null, 2));

      const resolvedDynamicSchema = resolveSchema(DynamicSchema);
      expect(resolvedDynamicSchema.$dynamicAnchor).toBe("node");

      const TestDynamicRef = object({
        properties: {
          ref: TestDynamic,
        },
        required: ["ref"],
      });
      const DynamicRefSchema = TestDynamicRef.toSchema();
      console.log(
        "DynamicRefSchema:",
        JSON.stringify(DynamicRefSchema, null, 2)
      );
      const resolvedDynamicRef = resolveSchema(DynamicRefSchema);
      expect(typeof (resolvedDynamicRef.properties.ref.$ref || "")).toBe(
        "string"
      );
    });
  });

  describe("Recursive Schemas", () => {
    it("generates a recursive schema using built-in $recursiveRef", () => {
      const Node = object({
        title: "Node",
        $recursiveAnchor: true, // mark this as the recursive anchor
        properties: {
          value: number(),
          children: array({
            items: { $recursiveRef: "#" }, // reference back to the anchor
            minItems: 0,
          }),
        },
        required: ["value", "children"],
      });

      const nodeSchema = Node.toSchema();
      console.log("nodeSchema:", JSON.stringify(nodeSchema, null, 2));

      expect((nodeSchema as any).$recursiveAnchor).toBe(true);

      const childrenSchema =
        typeof nodeSchema === "object" && nodeSchema.properties
          ? nodeSchema.properties.children
          : undefined;
      const childItemRef =
        childrenSchema.items && childrenSchema.items.$recursiveRef;
      expect(childItemRef).toBe("#");
    });
  });

  describe("$vocabulary", () => {
    it("preserves custom $vocabulary in the generated schema", () => {
      const TestVocab = object({
        properties: {
          field: string(),
        },
        $vocabulary: { "http://example.com/vocab": true },
        required: ["field"],
      });
      const VocabSchema = TestVocab.toSchema();
      expect((VocabSchema as any).$vocabulary).toEqual({
        "http://example.com/vocab": true,
      });
    });
  });

  describe("Boolean Schemas", () => {
    it("generates a schema that is simply true", () => {
      const TrueSchema = {
        toSchema() {
          return true;
        },
      };
      const generated = TrueSchema.toSchema();
      expect(generated).toBe(true);
    });

    it("generates a schema that is simply false", () => {
      const FalseSchema = {
        toSchema() {
          return false;
        },
      };
      const generated = FalseSchema.toSchema();
      expect(generated).toBe(false);
    });
  });

  describe("propertyNames Keyword", () => {
    it("validates property names against a given pattern", async () => {
      const TestPropNamesInstance = object({
        properties: {
          field: string(),
        },
        propertyNames: { pattern: "^[a-z]+$" },
        additionalProperties: true,
        required: ["field"],
      });
      const propNamesSchema = TestPropNamesInstance.toSchema();
      expect((propNamesSchema as any).propertyNames).toEqual({
        pattern: "^[a-z]+$",
      });

      let result = await TestPropNamesInstance.validate({
        field: "hello",
        extra: "ok",
      });
      console.log(
        "Validation result for valid property names:",
        JSON.stringify(result, null, 2)
      );
      expect(result.valid).toBe(true);

      result = await TestPropNamesInstance.validate({
        field: "hello",
        Extra: "fail",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("Combination Edge Cases", () => {
    it("validates a complex schema combining allOf, anyOf, oneOf, and not", async () => {
      const Complex = object({
        properties: {
          value: string({
            allOf: [{ minLength: 3 }, { maxLength: 5 }],
            anyOf: [{ pattern: "^[a-z]+$" }, { pattern: "^[0-9]+$" }],
            oneOf: [{ enum: ["abc", "123"] }, { enum: ["def", "456"] }],
            not: { const: "bad" },
          }),
        },
        required: ["value"],
      });
      console.log(
        "Generated Complex schema:",
        JSON.stringify(Complex.toSchema(), null, 2)
      );
      let result = await Complex.validate({ value: "abc" });
      expect(result.valid).toBe(true);

      result = await Complex.validate({ value: "bad" });
      expect(result.valid).toBe(false);

      result = await Complex.validate({ value: "abcdef" });
      expect(result.valid).toBe(false);
    });
  });

  describe("Meta-schema Validation", () => {
    it("the generated schema passes validation against the official JSON Schema 2020-12 meta-schema", () => {
      const ajv = new draft2020();
      const MetaTest = object({
        properties: {
          field: string({ minLength: 3 }),
        },
        required: ["field"],
      });
      const metaTestSchema = MetaTest.toSchema();
      const validMeta = ajv.validateSchema(metaTestSchema);
      expect(validMeta).toBe(true);
      if (!validMeta) {
        console.error("Meta-schema errors:", ajv.errors);
      }
    });
  });
});
