# LOOM Schema

**A schema system that does exactly what you need.**  
Type inference. Runtime validation. JSON Schema generation.  
Zero build steps. No extra fluff. It just works.

---

LOOM Schema was built because nothing else got this balance right:

- ✅ Type-safe and composable
- ✅ Validates at runtime
- ✅ Emits spec-compliant JSON Schema
- ❌ No codegen
- ❌ No decorators
- ❌ No build step

You write schema-like TypeScript. You get real JSON Schema and real validation. That’s the whole point.

---

## 🛠 Install

```sh
bun add loom-schema
```

Everything’s bundled — including `ajv` and `ajv-formats`. No extra dependencies.

---

## 🚀 Example

```ts
import { object, string, number, Infer } from "loom-schema";

const User = object({
  name: string({ minLength: 1 }),
  age: number({ minimum: 0 }),
});

type UserType = Infer<typeof User>;

const result = await User.validate({ name: "Ada", age: 32 });

if (!result.valid) {
  console.error(result.errors);
}
```

---

## 🎯 Use Cases

Use LOOM Schema when you need to feed schemas into systems that **expect schemas**:

- OpenAI Function calling
- MCP & function serialization
- API endpoints with runtime enforcement
- Config validation and generation
- Frontend forms based on types
- CLI arg structure and validation

If it wants a schema, LOOM can give it one — safely, programmatically, and without ceremony.

---

## ✨ Features

- 📐 **TypeScript-first**: deeply inferred types
- 🧩 **Composable fragments**: mix and reuse schema pieces with ease
- 🎛 **All the basics**: `allOf`, `anyOf`, `oneOf`, conditionals, etc.
- 📄 **Standards-based**: JSON Schema 2020-12 compliance
- 🧪 **Runtime validation**: powered by AJV with formats out of the box
- 📦 **No config, no build step, no codegen**

---

## 📐 Schema Inference

```ts
const Config = object({
  apiKey: string(),
  retries: number({ default: 3 }),
});

type ConfigType = Infer<typeof Config>;
// {
//   apiKey: string;
//   retries: number;
// }
```

---

## 🧩 Composition

```ts
import { allOf, object, string } from "loom-schema";

const WithId = object({ id: string({ format: "uuid" }) });

const Product = allOf([
  WithId,
  object({
    name: string(),
    description: string(),
  }),
]);
```

---

## 🧪 Validation

```ts
const result = await Product.validate({
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Widget",
  description: "An example widget",
});
```

Returns `{ valid, errors }` from AJV — clean and informative.

---

## 🪶 Philosophy

LOOM Schema wasn’t built to be trendy. It was built to be **minimal**, **practical**, and **actually usable** across systems that expect real JSON Schema. It gives you the right pieces to build and validate data shapes at runtime — without taking over your project.

---

**You write types.**  
**You get schemas.**  
**That’s it.**
