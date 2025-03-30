// import {
//   schema as s,
//   number,
//   string,
//   boolean,
//   object,
//   array,
//   Schema,
// } from "../src/schema";

// describe("Schema Helpers", () => {
//   describe("Primitive Helpers", () => {
//     class PrimitiveTest extends Schema {
//       value = number({ minimum: 0 });
//     }

//     test("should generate a JSON Schema with a number property having minimum 0", () => {
//       const jsonSchema = PrimitiveTest.to();
//       expect(jsonSchema.type).toBe("object");
//       expect(jsonSchema.properties).toHaveProperty("value");
//       expect(jsonSchema.properties.value.type).toBe("number");
//       expect(jsonSchema.properties.value.minimum).toBe(0);
//     });
//   });

//   describe("Named Schema Factory", () => {
//     const UserSchema = s("User", {
//       name: string({ minLength: 1 }),
//       age: number({ minimum: 18 }),
//     });

//     test("should generate a named JSON Schema with correct title and properties", () => {
//       const jsonSchema = UserSchema.to();
//       expect(jsonSchema.title).toBe("User");
//       expect(jsonSchema.properties).toHaveProperty("name");
//       expect(jsonSchema.properties.name.type).toBe("string");
//       expect(jsonSchema.properties.name.minLength).toBe(1);
//       expect(jsonSchema.properties).toHaveProperty("age");
//       expect(jsonSchema.properties.age.type).toBe("number");
//       expect(jsonSchema.properties.age.minimum).toBe(18);
//     });
//   });

//   describe("Extended Schema Class", () => {
//     class Extended extends Schema {
//       email = string({ format: "email" });
//     }

//     test("should generate a JSON Schema for an extended schema with email format", () => {
//       const jsonSchema = Extended.to();
//       expect(jsonSchema.properties).toHaveProperty("email");
//       expect(jsonSchema.properties.email.type).toBe("string");
//       expect(jsonSchema.properties.email.format).toBe("email");
//     });

//     test("should validate valid and invalid data correctly", async () => {
//       const validData = { email: "user@example.com" };
//       const invalidData = { email: "invalid-email" };

//       const validResult = await Extended.validate(validData);
//       expect(validResult.valid).toBe(true);

//       const invalidResult = await Extended.validate(invalidData);
//       expect(invalidResult.valid).toBe(false);
//     });
//   });
// });

// class BooleanTest extends Schema {
//   flag = boolean();
// }

// test("should generate a JSON Schema with a boolean property", () => {
//   const jsonSchema = BooleanTest.to();
//   expect(jsonSchema.properties).toHaveProperty("flag");
//   expect(jsonSchema.properties.flag.type).toBe("boolean");
// });

// class ObjectTest extends Schema {
//   details = object({ properties: { key: string({ minLength: 2 }) } });
// }

// test("should generate a JSON Schema for an object property with nested properties", () => {
//   const jsonSchema = ObjectTest.to();
//   expect(jsonSchema.properties).toHaveProperty("details");
//   expect(jsonSchema.properties.details.type).toBe("object");
//   expect(jsonSchema.properties.details.properties).toHaveProperty("key");
//   expect(jsonSchema.properties.details.properties.key.type).toBe("string");
//   expect(jsonSchema.properties.details.properties.key.minLength).toBe(2);
// });

// class ArrayTest extends Schema {
//   items = array({ items: number({ minimum: 1 }) });
// }

// test("should generate a JSON Schema with an array property having item constraints", () => {
//   const jsonSchema = ArrayTest.to();
//   expect(jsonSchema.properties).toHaveProperty("items");
//   expect(jsonSchema.properties.items.type).toBe("array");
//   expect(jsonSchema.properties.items.items.minimum).toBe(1);
// });

// test("Primatives from schema helper", () => {
//   class Test {
//     name = s(String, {
//       minLength: 1,
//     });
//   }

//   const jsonSchema = Schema.extends(Test).to();
//   expect(jsonSchema.properties).toHaveProperty("name");
//   expect(jsonSchema.properties.name.type).toBe("string");
// });
