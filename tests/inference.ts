import {
  string,
  integer,
  boolean,
  array,
  object,
  allOf,
  anyOf,
  conditional,
  Infer,
  number,
} from "../src/schema"; // adjust the path as needed

// =============================================================================
// 1. Simple Primitive Inference
// =============================================================================

// A simple string fragment.
const nameSchema = string({ minLength: 1 });
type NameType = Infer<typeof nameSchema>;
// Expect NameType to be string.
const validName: NameType = "Alice";
// @ts-expect-error
const invalidName: NameType = 42;

// A simple integer fragment.
const ageSchema = integer({ minimum: 0 });
type AgeType = Infer<typeof ageSchema>;
// Expect AgeType to be number.
const validAge: AgeType = 30;
// @ts-expect-error
const invalidAge: AgeType = "30";

// =============================================================================
// 2. Object Inference with Required & Optional Properties
// =============================================================================

// An object where both "name" and "age" are required.
const userSchema = object({
  properties: {
    name: string(),
    age: integer(),
  },
  required: ["name", "age"],
});
type UserType = Infer<typeof userSchema>;
// Expected: { name: string; age: number }
const validUser: UserType = { name: "Bob", age: 25 };
// @ts-expect-error
const invalidUser: UserType = { name: "Bob" }; // missing "age"

// An object where only "name" is required.
const partialUserSchema = object({
  properties: {
    name: string(),
    age: integer(),
  },
  required: ["name"],
});
type PartialUserType = Infer<typeof partialUserSchema>;
// Expected: { name: string; age?: number }
const validPartialUser: PartialUserType = { name: "Carol" };
const validPartialUser2: PartialUserType = { name: "Carol", age: 40 };
// @ts-expect-error
const invalidPartialUser: PartialUserType = { age: 40 }; // missing "name"

// =============================================================================
// 3. Object with Extra Keys (like not and additionalProperties)
// =============================================================================

const testingNot = object({
  properties: {
    name: string(),
    age: integer(),
  },
  required: ["name", "age"],
  not: object({
    properties: {
      name: string(),
      age: integer(),
    },
    required: ["name", "age"],
    additionalProperties: false,
  }),
  additionalProperties: false,
});
type TestingNotType = Infer<typeof testingNot>;
// Expected: { name: string; age: number }
const validTestingNot: TestingNotType = { name: "Dana", age: 28 };
// @ts-expect-error
const invalidTestingNot: TestingNotType = { name: "Dana" }; // missing "age"

// =============================================================================
// 4. Array Inference
// =============================================================================

const stringArraySchema = array({ items: string() });
type StringArrayType = Infer<typeof stringArraySchema>;
// Expected: string[]
const validStringArray: StringArrayType = ["hello", "world"];
// @ts-expect-error
const invalidStringArray: StringArrayType = [42];

// =============================================================================
// 5. Composition with allOf
// =============================================================================

const extraSchema = object({
  properties: {
    active: boolean(),
  },
  required: ["active"],
});
const combinedSchema = allOf([userSchema, extraSchema]);
type CombinedType = Infer<typeof combinedSchema>;
// Expected: { name: string; age: number } & { active: boolean }
const validCombined: CombinedType = { name: "Eve", age: 35, active: true };
// @ts-expect-error
const invalidCombined: CombinedType = { name: "Eve", age: 35 };

// =============================================================================
// 6. Composition with anyOf
// =============================================================================

const unionSchema = anyOf([string(), integer()]);
type UnionType = Infer<typeof unionSchema>;
// Expected: string | number
const validUnion1: UnionType = "hello";
const validUnion2: UnionType = 123;
// @ts-expect-error
const invalidUnion: UnionType = true;

// =============================================================================
// 7. Conditional Inference
// =============================================================================

const conditionalSchema = object({
  properties: {
    role: string({ enum: ["user", "admin"] }),
    adminCode: string({ minLength: 6 }),
  },
  required: ["role"],
  if: object({
    properties: {
      role: string({ const: "admin" }),
    },
    required: ["role"],
  }),
  then: object({
    properties: {
      adminCode: string({ minLength: 6 }),
    },
    required: ["adminCode"],
  }),
  else: object({}),
});
type ConditionalType = Infer<typeof conditionalSchema>;
// Typically, this will infer { role: string; adminCode?: string }
// (since adminCode is conditionally required, the overall inferred type remains the union of possibilities)
const validConditionalUser: ConditionalType = { role: "user" };
const validConditionalAdmin: ConditionalType = {
  role: "admin",
  adminCode: "secret123",
};
// @ts-expect-error
// TODO: In an ideal world, TypeScript would infer conditional logic,
// but for now we rely on runtime validation. Maybe one day TS will let this work.
const invalidConditionalUser: ConditionalType = { role: "admin" }; // missing adminCode

// =============================================================================
// 8. Union of Objects via oneOf (Optional)
// =============================================================================

const oneOfSchema = object({
  oneOf: [
    object({
      properties: { type: string({ const: "a" }), a: string() },
      required: ["type", "a"],
    }),
    object({
      properties: { type: string({ const: "b" }), b: number() },
      required: ["type", "b"],
    }),
  ],
});
type OneOfType = Infer<typeof oneOfSchema>;
// Expected: { type: "a"; a: string } | { type: "b"; b: number }
const validOneOfA: OneOfType = { type: "a", a: "foo" };
const validOneOfB: OneOfType = { type: "b", b: 123 };
// @ts-expect-error
// TODO: In an ideal world, TypeScript would infer conditional logic,
// but for now we rely on runtime validation. Maybe one day TS will let this work.
const invalidOneOf: OneOfType = { type: "a", b: 123 };

console.log(
  "All type-checking tests passed (if your IDE/TS compiler shows no errors)."
);
