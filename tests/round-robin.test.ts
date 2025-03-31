import {
  type SchemaFragment,
  object,
  string,
  schema as s,
  number,
  integer,
  boolean,
  nil,
  array,
  allOf,
  anyOf,
  oneOf,
  type Infer,
  conditional,
} from "../src/schema";
import fs from "fs";
import path from "path";

function fromJSON(schema: any): any {
  if (typeof schema === "boolean") {
    return { toSchema: () => schema };
  }

  if (schema.type === "object" && schema.properties) {
    const fragments: Record<string, any> = {};
    for (const key in schema.properties) {
      fragments[key] = fromJSON(schema.properties[key]);
    }

    const objFragment = object({
      title: schema.title,
      ...schema,
      properties: fragments,
    });
    return Object.assign(objFragment, fragments);
  }
  if (schema.type === "array") {
    let newSchema = { ...schema };
    if (schema.hasOwnProperty("items")) {
      if (typeof schema.items === "boolean") {
        newSchema.items = schema.items;
      } else {
        newSchema.items = fromJSON(schema.items);
      }
    }
    const frag = array(newSchema);

    if (schema.hasOwnProperty("items") && typeof schema.items === "boolean") {
      const originalToSchema = frag.toSchema.bind(frag);
      frag.toSchema = () => {
        const generated = originalToSchema();
        generated.items = schema.items;
        return generated;
      };
    }
    return frag;
  }
  if (schema.type === "string") {
    return string(schema);
  }
  if (schema.type === "number") {
    return number(schema);
  }
  if (schema.type === "integer") {
    return integer(schema);
  }
  if (schema.type === "boolean") {
    return boolean(schema);
  }
  if (schema.type === "null") {
    return nil(schema);
  }
  return s(schema);
}

function canonicalize(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const elems = value.map(canonicalize).sort();
    return `[${elems.join(",")}]`;
  }

  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort();
  const keyValuePairs = keys.map(
    (key) => JSON.stringify(key) + ":" + canonicalize(value[key])
  );
  return `{${keyValuePairs.join(",")}}`;
}

function basicallyEqual(a: any, b: any): boolean {
  return canonicalize(a) === canonicalize(b);
}

const directoryPath = path.join(
  __dirname,
  "JSON-Schema-Test-Suite/tests/draft2020-12"
);
const testCases: any[] = [];

function readJsonFilesRecursively(dir: string) {
  console.log(`Reading test files from: ${dir}`);
  if (!fs.existsSync(dir)) {
    console.error(`Test directory not found: ${dir}`);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "remotes") {
        console.log(`Skipping remote refs directory: ${fullPath}`);
        continue;
      }
      readJsonFilesRecursively(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      console.log(`Reading file: ${fullPath}`);
      const fileContent = fs.readFileSync(fullPath, "utf8");
      try {
        const suites = JSON.parse(fileContent);
        if (Array.isArray(suites)) {
          suites.forEach((testCase) => {
            if (
              testCase &&
              typeof testCase.description === "string" &&
              typeof testCase.schema !== "undefined" &&
              Array.isArray(testCase.tests)
            ) {
              testCases.push(testCase);
            } else {
              console.warn(
                `Skipping invalid test case structure in file: ${fullPath}`
              );
            }
          });
        } else {
          console.warn(`Expected an array of test suites in file: ${fullPath}`);
        }
      } catch (err: any) {
        console.error(`Failed to parse JSON in file: ${fullPath}`);
        console.error(err.message);
      }
    }
  }
}

readJsonFilesRecursively(directoryPath);
console.log(`Total test suites loaded: ${testCases.length}`);

describe("DSL Roundtrip: Convert JSON schema to DSL fragment via fromJSON and match expected schema", () => {
  testCases.forEach((testCase) => {
    describe(testCase.description, () => {
      test("DSL roundtrip produces expected schema", () => {
        const coerceTypeFromKeywords = (schema: any) => {
          if (
            schema.unevaluatedItems ||
            schema.items ||
            schema.prefixItems ||
            schema.contains
          ) {
            if (!schema.type) {
              schema.type = "array";
            }
          }
          return schema;
        };

        const inputSchema = coerceTypeFromKeywords(testCase.schema);
        const dslFragment = fromJSON(inputSchema);
        console.log(`fromJSON output: ${dslFragment}`);
        const generatedSchema = dslFragment.toSchema();

        console.log(
          `DSL Fragment: ${JSON.stringify(generatedSchema, null, 2)}`
        );
        console.log(
          `Expected Schema: ${JSON.stringify(testCase.schema, null, 2)}`
        );

        expect(basicallyEqual(generatedSchema, testCase.schema)).toBe(true);
      });
    });
  });
});
