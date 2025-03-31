import {
  type ErrorObject,
  type Options as AjvOptions,
  type KeywordDefinition,
  type Vocabulary,
} from "ajv";
import addFormats from "ajv-formats";
import draft2020 from "ajv/dist/2020.js";

const schemaIdCache = new WeakMap<any, string>();

function sortedStringify(obj: any): string {
  if (obj === null) return "null";
  if (Array.isArray(obj)) {
    return "[" + obj.map(sortedStringify).join(",") + "]";
  }
  if (typeof obj === "object") {
    const keys = Reflect.ownKeys(obj).sort();
    return (
      "{" +
      keys
        .map((key) => JSON.stringify(key) + ":" + sortedStringify(obj[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(obj);
}

function getSchemaId(schema: any): string {
  if (schema !== null && typeof schema === "object") {
    const cached = schemaIdCache.get(schema);
    if (cached) return cached;
  }
  const str = sortedStringify(schema);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const id = `urn:loom:hash-${Math.abs(hash).toString(16)}`;
  if (schema !== null && typeof schema === "object") {
    schemaIdCache.set(schema, id);
  }
  return id;
}

export interface BaseSchemaOptions {
  $schema?: string;
  $id?: string;
  $vocabulary?: Record<string, boolean>;
  $comment?: string;
  $anchor?: string;
  $recursiveAnchor?: boolean;
  $recursiveRef?: string;
  title?: string;
  description?: string;
  examples?: any[];
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  default?: any;
  allOf?: JsonSchemaInput[];
  anyOf?: JsonSchemaInput[];
  oneOf?: JsonSchemaInput[];
  not?: JsonSchema | boolean;
  if?: JsonSchema | boolean;
  then?: JsonSchema | boolean;
  else?: JsonSchema | boolean;
  $ref?: string;
  $defs?: Record<string, JsonSchema | boolean>;
  enum?: any[];
  const?: any;
  [key: string]: any;
}

export type JsonSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

export type KnownFormat =
  | "date-time"
  | "date"
  | "time"
  | "duration"
  | "email"
  | "idn-email"
  | "hostname"
  | "idn-hostname"
  | "ipv4"
  | "ipv6"
  | "uri"
  | "uri-reference"
  | "iri"
  | "iri-reference"
  | "uuid"
  | "json-pointer"
  | "relative-json-pointer"
  | "regex"
  | string;

export interface StringSchemaOptions extends BaseSchemaOptions {
  type?: "string";
  format?: KnownFormat;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  contentEncoding?: string;
  contentMediaType?: string;
  contentSchema?: JsonSchemaInput | boolean;
}

export interface NumberSchemaOptions extends BaseSchemaOptions {
  type?: "number";
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}

export interface IntegerSchemaOptions extends BaseSchemaOptions {
  type?: "integer";
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}

export interface BooleanSchemaOptions extends BaseSchemaOptions {
  type?: "boolean";
}

export interface ArraySchemaOptions extends BaseSchemaOptions {
  type?: "array";
  items?: JsonSchemaInput;
  prefixItems?: JsonSchemaInput[];
  additionalItems?: JsonSchemaInput;
  contains?: JsonSchemaInput;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minContains?: number;
  maxContains?: number;
  unevaluatedItems?: JsonSchemaInput | boolean;
}

export interface ObjectSchemaOptions extends BaseSchemaOptions {
  type?: "object";
  properties?: Record<string, JsonSchemaInput>;
  patternProperties?: Record<string, JsonSchemaInput>;
  additionalProperties?: JsonSchemaInput | boolean;
  propertyNames?: JsonSchemaInput;
  minProperties?: number;
  maxProperties?: number;
  required?: string[];
  dependentSchemas?: Record<string, JsonSchemaInput>;
  dependentRequired?: Record<string, string[]>;
  unevaluatedProperties?: JsonSchemaInput | boolean;
}

export interface NullSchemaOptions extends BaseSchemaOptions {
  type?: "null";
}

export type JsonSchema = JsonSchemaBase;
export type JsonSchemaBase = BaseSchemaOptions;

export type SchemaFragment<T = any> = {
  toSchema(
    name?: string,
    visited?: Map<SchemaFragment<any>, string>,
    usageMap?: Map<SchemaFragment<any>, number>
  ): JsonSchema;
  validate(
    data: any,
    ajvOptions?: AjvOptions & {
      customKeywords?: (KeywordDefinition | string)[];
      customVocabularies?: Vocabulary[];
    }
  ): Promise<{ valid: boolean; errors: ErrorObject[] | null | undefined }>;
  toSchemaWithUsage?: (name?: string) => JsonSchema;
};

export type JsonSchemaInput = JsonSchema | SchemaFragment<any>;

function isShorthandObject(options: any): boolean {
  const reserved = new Set([
    "type",
    "properties",
    "required",
    "patternProperties",
    "additionalProperties",
    "title",
    "description",
    "$schema",
    "$id",
    "$defs",
    "allOf",
    "anyOf",
    "oneOf",
    "not",
    "if",
    "then",
    "else",
    "default",
    "examples",
  ]);
  for (const key of Object.keys(options)) {
    if (reserved.has(key)) return false;
  }
  return true;
}

function resolveInput(
  input: JsonSchemaInput,
  visited: Map<SchemaFragment<any>, string> = new Map(),
  usageMap: Map<SchemaFragment<any>, number> = new Map()
): JsonSchema {
  return isFragment(input)
    ? input.toSchema(undefined, visited, usageMap)
    : input;
}

function filterInvalidKeywords(
  schema: JsonSchemaBase,
  _context = "schema"
): JsonSchemaBase {
  return schema;
}

function isFragment(x: any): x is SchemaFragment<any> {
  return x && typeof x.toSchema === "function";
}

function processCompositionKeys(
  schema: any,
  visited: Map<SchemaFragment<any>, string>,
  usageMap?: Map<SchemaFragment<any>, number>
): any {
  const compositionKeys = ["allOf", "anyOf", "oneOf"];
  for (const key of compositionKeys) {
    if (Array.isArray(schema[key])) {
      schema[key] = schema[key].map((item: any) =>
        resolveInput(item, visited, usageMap)
      );
    }
  }
  return schema;
}

function resolveSchemaFragments(
  schema: any,
  visited: Map<SchemaFragment<any>, string> = new Map(),
  usageMap: Map<SchemaFragment<any>, number> = new Map()
): any {
  if (isFragment(schema)) {
    return schema.toSchema(undefined, visited, usageMap);
  }
  if (Array.isArray(schema)) {
    return schema.map((item) =>
      resolveSchemaFragments(item, visited, usageMap)
    );
  }
  if (schema && typeof schema === "object") {
    const keysToResolve = [
      "if",
      "then",
      "else",
      "not",
      "dependentSchemas",
      "patternProperties",
      "additionalProperties",
      "prefixItems",
    ];
    for (const key of Reflect.ownKeys(schema)) {
      if (keysToResolve.includes(key as string)) {
        if (Array.isArray(schema[key])) {
          schema[key] = schema[key].map((item: any) =>
            resolveSchemaFragments(item, visited, usageMap)
          );
        } else if (schema[key] && typeof schema[key] === "object") {
          if (
            ["dependentSchemas", "patternProperties"].includes(key as string)
          ) {
            for (const subKey of Reflect.ownKeys(schema[key])) {
              schema[key][subKey] = resolveSchemaFragments(
                schema[key][subKey],
                visited,
                usageMap
              );
            }
          } else {
            schema[key] = resolveSchemaFragments(
              schema[key],
              visited,
              usageMap
            );
          }
        }
      }
    }
  }
  return schema;
}

function withValidation<
  T,
  U extends {
    toSchema(
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema;
  }
>(
  fragment: U
): U & SchemaFragment<T> & { toSchemaWithUsage(name?: string): JsonSchema } {
  (
    fragment as U &
      SchemaFragment<T> & { toSchemaWithUsage(name?: string): JsonSchema }
  ).validate = async function (
    data: any,
    ajvOptions?: AjvOptions & {
      customKeywords?: (KeywordDefinition | string)[];
      customVocabularies?: Vocabulary[];
    }
  ) {
    return defaultValidate(fragment, data, ajvOptions);
  };

  (
    fragment as U & { toSchemaWithUsage(name?: string): JsonSchema }
  ).toSchemaWithUsage = function (name?: string) {
    const usageMap = new Map<SchemaFragment<any>, number>();
    collectUsage(this, usageMap);
    return this.toSchema(name, new Map(), usageMap);
  };

  return fragment as U &
    SchemaFragment<T> & { toSchemaWithUsage(name?: string): JsonSchema };
}

async function defaultValidate(
  fragment: {
    toSchema(
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema;
  },
  data: any,
  ajvOptions?: AjvOptions & {
    customKeywords?: (KeywordDefinition | string)[];
    customVocabularies?: Vocabulary[];
  }
): Promise<{ valid: boolean; errors: ErrorObject[] | null | undefined }> {
  let schema: JsonSchema;
  try {
    const fragmentWithUsage = fragment as SchemaFragment<any> & {
      toSchemaWithUsage?: (name?: string) => JsonSchema;
    };
    schema = fragmentWithUsage.toSchemaWithUsage
      ? fragmentWithUsage.toSchemaWithUsage(undefined)
      : fragment.toSchema(undefined, new Map());
    if (typeof schema !== "object" && typeof schema !== "boolean") {
      throw new Error("Schema generation resulted in invalid type.");
    }
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          keyword: "schemaGeneration",
          message: `Failed to generate schema: ${
            error instanceof Error ? error.message : String(error)
          }`,
          params: {},
          schemaPath: "#",
          instancePath: "",
        },
      ],
    };
  }

  let ajv: any;
  let finalOpts: AjvOptions;
  try {
    let requiresDynamic = false;
    let requiresUnevaluated = false;
    try {
      const schemaStr = JSON.stringify(schema);
      requiresDynamic =
        schemaStr.includes('"$dynamicRef"') ||
        schemaStr.includes('"$recursiveRef"') ||
        schemaStr.includes('"$dynamicAnchor"');
      requiresUnevaluated =
        schemaStr.includes('"unevaluatedProperties"') ||
        schemaStr.includes('"unevaluatedItems"');
    } catch {}

    const defaultOpts: AjvOptions = {
      allErrors: true,
      strict: "log",
      ...(requiresDynamic && { $dynamicRef: true }),
      ...(requiresUnevaluated && { unevaluated: true }),
      verbose: true,
      logger: console,
    };
    const { customKeywords, customVocabularies, ...coreOpts } =
      ajvOptions || {};
    finalOpts = { ...defaultOpts, ...coreOpts };
    ajv = new draft2020(finalOpts);
    addFormats(ajv, { mode: "fast", keywords: true });
    customVocabularies?.forEach((v) => ajv.addVocabulary(v));
    customKeywords?.forEach((k) => ajv.addKeyword(k));
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          keyword: "ajvInitialization",
          message: `Failed to initialize AJV: ${
            error instanceof Error ? error.message : String(error)
          }`,
          params: {},
          schemaPath: "#",
          instancePath: "",
        },
      ],
    };
  }

  let validateFn: any;
  try {
    const compileResult = ajv.compile(schema);
    validateFn =
      typeof compileResult === "function" ? compileResult : await compileResult;
  } catch (error: any) {
    return {
      valid: false,
      errors: [
        {
          keyword: "compilation",
          message: `Schema failed to compile${
            schema && (schema as any).title
              ? " (title: " + (schema as any).title + ")"
              : ""
          }: ${error instanceof Error ? error.message : String(error)}`,
          params: {},
          schemaPath: error.schemaPath || "#",
          instancePath: "",
        },
      ],
    };
  }

  try {
    const validResult = await validateFn(data);
    return { valid: validResult as boolean, errors: validateFn.errors || null };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          keyword: "runtimeValidation",
          message: `Error during data validation: ${
            error instanceof Error ? error.message : String(error)
          }${
            schema && (schema as any).title
              ? " (schema title: " + (schema as any).title + ")"
              : ""
          }`,
          params: {},
          schemaPath: "#",
          instancePath: "",
        },
      ],
    };
  }
}

function collectUsage(
  node: any,
  usageMap: Map<SchemaFragment<any>, number>
): void {
  if (isFragment(node)) {
    usageMap.set(node, (usageMap.get(node) || 0) + 1);
    const schema = node.toSchema(undefined, new Map(), usageMap);
    collectUsage(schema, usageMap);
  } else if (Array.isArray(node)) {
    node.forEach((item) => collectUsage(item, usageMap));
  } else if (node && typeof node === "object") {
    for (const key of Reflect.ownKeys(node)) {
      collectUsage(node[key], usageMap);
    }
  }
}

function createFragment<TValue, TOptions>(
  jsonType: JsonSchemaType,
  options: Partial<TOptions> = {}
): SchemaFragment<TValue> {
  const baseFragment = {
    toSchema: function (
      this: any,
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema {
      visited = visited || new Map();
      usageMap = usageMap || new Map();
      const base = Object.assign(
        Object.create(null),
        { type: jsonType },
        options
      ) as JsonSchemaBase;
      let schema = processCompositionKeys(
        filterInvalidKeywords(base, "fragment"),
        visited,
        usageMap
      );
      schema = resolveSchemaFragments(schema, visited, usageMap);
      const usageCount = usageMap ? usageMap.get(this) || 0 : 0;
      if (!name && (isSimpleSchema(schema) || usageCount <= 1)) {
        return schema;
      }
      if (visited.has(this)) {
        return { $ref: visited.get(this)! };
      }
      const id = name ? `urn:loom:${name}` : getSchemaId(schema);
      visited.set(this, id);
      return name ? wrapWithName(schema, name) : { ...schema, $id: id };
    },
    validate: async function () {
      throw new Error("validate method not attached");
    },
  };
  return withValidation<TValue, typeof baseFragment>(baseFragment);
}

function isSimpleSchema(schema: any): boolean {
  if (typeof schema !== "object" || schema === null) return true;
  const keys = Reflect.ownKeys(schema).filter(
    (k) => k !== "$id" && k !== "title" && k !== "$ref"
  );
  const compositionKeys = ["allOf", "anyOf", "oneOf"];
  if (keys.some((k) => compositionKeys.includes(k as string))) return false;
  return keys.length <= 2;
}

function wrapWithName(schema: JsonSchema, name: string): JsonSchema {
  if (typeof schema === "boolean") return schema;
  const merged: JsonSchemaBase = Object.assign(Object.create(null), schema, {
    title: name,
    $id: `urn:loom:${name}`,
  });
  return processCompositionKeys(
    filterInvalidKeywords(merged, "namedSchema"),
    new Map()
  );
}

export const schema = (
  options: Partial<ObjectSchemaOptions> = {}
): SchemaFragment<any> => {
  const baseFragment = {
    toSchema: function (
      this: any,
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema {
      visited = visited || new Map();
      usageMap = usageMap || new Map();

      const deepResolve = (schema: any): any => {
        if (isFragment(schema)) {
          return schema.toSchema(undefined, visited, usageMap);
        }
        if (Array.isArray(schema)) {
          return schema.map(deepResolve);
        }
        if (schema && typeof schema === "object") {
          const resolved: any = Object.create(null);
          for (const key of Reflect.ownKeys(schema)) {
            resolved[key] = deepResolve(schema[key]);
          }
          return resolved;
        }
        return schema;
      };

      const base = deepResolve(
        Object.assign(Object.create(null), options)
      ) as JsonSchemaBase;

      let schema = processCompositionKeys(
        filterInvalidKeywords(base, "base"),
        visited,
        usageMap
      );
      schema = resolveSchemaFragments(schema, visited, usageMap);
      const usageCount = usageMap ? usageMap.get(this) || 0 : 0;
      if (!name && (isSimpleSchema(schema) || usageCount <= 1)) {
        return schema;
      }
      if (visited.has(this)) {
        return { $ref: visited.get(this)! };
      }
      const id = name ? `urn:loom:${name}` : getSchemaId(schema);
      visited.set(this, id);
      return name ? wrapWithName(schema, name) : { ...schema, $id: id };
    },
    validate: async function () {
      throw new Error("validate method not attached");
    },
  };
  return withValidation<any, typeof baseFragment>(baseFragment);
};

export const string = (
  options: Partial<StringSchemaOptions> = {}
): SchemaFragment<string> =>
  createFragment<string, StringSchemaOptions>("string", options);

export const number = (
  options: Partial<NumberSchemaOptions> = {}
): SchemaFragment<number> =>
  createFragment<number, NumberSchemaOptions>("number", options);

export const integer = (
  options: Partial<IntegerSchemaOptions> = {}
): SchemaFragment<number> =>
  createFragment<number, IntegerSchemaOptions>("integer", options);

export const boolean = (
  options: Partial<BooleanSchemaOptions> = {}
): SchemaFragment<boolean> =>
  createFragment<boolean, BooleanSchemaOptions>("boolean", options);

export const nil = (
  options: Partial<NullSchemaOptions> = {}
): SchemaFragment<null> =>
  createFragment<null, NullSchemaOptions>("null", options);

export const array = <T extends JsonSchemaInput | undefined = undefined>(
  options: Partial<ArraySchemaOptions> & { items?: T }
): SchemaFragment<T extends SchemaFragment<infer U> ? U[] : any[]> => {
  const baseFragment = {
    toSchema: function (
      this: any,
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema {
      visited = visited || new Map();
      usageMap = usageMap || new Map();
      const base = Object.assign(
        Object.create(null),
        { type: "array" },
        options
      ) as JsonSchemaBase;
      if (options.items) {
        base.items = resolveInput(options.items, visited, usageMap);
      }
      let schema = processCompositionKeys(
        filterInvalidKeywords(base, "array"),
        visited,
        usageMap
      );
      schema = resolveSchemaFragments(schema, visited, usageMap);
      const usageCount = usageMap ? usageMap.get(this) || 0 : 0;
      if (!name && (isSimpleSchema(schema) || usageCount <= 1)) {
        return schema;
      }
      if (visited.has(this)) {
        return { $ref: visited.get(this)! };
      }
      const id = name ? `urn:loom:${name}` : getSchemaId(schema);
      visited.set(this, id);
      return name ? wrapWithName(schema, name) : { ...schema, $id: id };
    },
    validate: async function () {
      throw new Error("validate method not attached");
    },
  };
  type OutType = T extends SchemaFragment<infer U> ? U[] : any[];
  return withValidation<OutType, typeof baseFragment>(baseFragment);
};

type InferExplicit<
  T extends {
    properties: Record<string, JsonSchemaInput>;
    required?: readonly (keyof T["properties"])[];
  }
> = {
  [K in T["required"] extends readonly (keyof T["properties"])[]
    ? T["required"][number]
    : never]: T["properties"][K] extends SchemaFragment<infer U> ? U : any;
} & {
  [K in Exclude<
    keyof T["properties"],
    T["required"] extends readonly (keyof T["properties"])[]
      ? T["required"][number]
      : never
  >]?: T["properties"][K] extends SchemaFragment<infer U> ? U : any;
};

type AllowAny<T extends object> = [keyof T] extends [never]
  ? T
  : T & { [K in Exclude<string, keyof T>]?: any };

export function object<
  T extends Partial<ObjectSchemaOptions> = ObjectSchemaOptions
>(
  options: AllowAny<T> = {} as T
): SchemaFragment<
  T extends {
    properties: Record<string, JsonSchemaInput>;
    required?: readonly (keyof T["properties"])[];
  }
    ? InferExplicit<T>
    : { [K in keyof T]: T[K] extends SchemaFragment<infer U> ? U : any }
> {
  const baseFragment = {
    toSchema: function (
      this: any,
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema {
      visited = visited || new Map();
      usageMap = usageMap || new Map();

      let resolvedOptions: Partial<ObjectSchemaOptions> & {
        properties?: Record<string, JsonSchemaInput>;
      } = options;
      if (
        resolvedOptions.properties === undefined &&
        isShorthandObject(resolvedOptions)
      ) {
        resolvedOptions = { properties: resolvedOptions };
      }
      if (resolvedOptions.properties) {
        const newProps: Record<string, JsonSchemaInput> = {};
        for (const key of Reflect.ownKeys(resolvedOptions.properties)) {
          if (typeof key === "string") {
            const prop = resolvedOptions.properties[key];
            if (prop !== undefined) {
              newProps[key] = resolveInput(prop, visited, usageMap);
            }
          }
        }
        resolvedOptions.properties = newProps;
      }
      const base = Object.assign(
        Object.create(null),
        { type: "object" },
        resolvedOptions
      ) as JsonSchemaBase;
      let schema = processCompositionKeys(
        filterInvalidKeywords(base, "object"),
        visited,
        usageMap
      );
      schema = resolveSchemaFragments(schema, visited, usageMap);
      const usageCount = usageMap ? usageMap.get(this) || 0 : 0;
      if (!name && (isSimpleSchema(schema) || usageCount <= 1)) {
        return schema;
      }
      if (visited.has(this)) {
        return { $ref: visited.get(this)! };
      }
      const id = name ? `urn:loom:${name}` : getSchemaId(schema);
      visited.set(this, id);
      return name ? wrapWithName(schema, name) : { ...schema, $id: id };
    },
    validate: async function () {
      throw new Error("validate method not attached");
    },
  };
  return withValidation<any, typeof baseFragment>(baseFragment);
}

export type Infer<T> = T extends SchemaFragment<infer U> ? U : never;

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

type AllOfOut<T extends readonly JsonSchemaInput[]> = UnionToIntersection<
  {
    [K in keyof T]: T[K] extends SchemaFragment<infer A> ? A : unknown;
  }[number]
>;

type AnyOfOut<T extends readonly JsonSchemaInput[]> = {
  [K in keyof T]: T[K] extends SchemaFragment<infer A> ? A : unknown;
}[number];

export const allOf = <
  T extends readonly [JsonSchemaInput, ...JsonSchemaInput[]]
>(
  fragments: T,
  options: Partial<BaseSchemaOptions> = {}
): SchemaFragment<AllOfOut<T>> => {
  const baseFragment = {
    toSchema: function (
      this: any,
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema {
      visited = visited || new Map();
      usageMap = usageMap || new Map();
      const all = fragments.map((frag) =>
        resolveInput(frag, visited, usageMap)
      );
      const base: JsonSchemaBase = { allOf: all, ...options };
      let schema = processCompositionKeys(
        filterInvalidKeywords(base, "allOf"),
        visited,
        usageMap
      );
      schema = resolveSchemaFragments(schema, visited, usageMap);
      const usageCount = usageMap ? usageMap.get(this) || 0 : 0;
      if (!name && (isSimpleSchema(schema) || usageCount <= 1)) {
        return schema;
      }
      if (visited.has(this)) {
        return { $ref: visited.get(this)! };
      }
      const id = name ? `urn:loom:${name}` : getSchemaId(schema);
      visited.set(this, id);
      return name ? wrapWithName(schema, name) : { ...schema, $id: id };
    },
    validate: async function () {
      throw new Error("validate method not attached");
    },
  };
  return withValidation<AllOfOut<T>, typeof baseFragment>(baseFragment);
};

export const anyOf = <
  T extends readonly [JsonSchemaInput, ...JsonSchemaInput[]]
>(
  fragments: T,
  options: Partial<BaseSchemaOptions> = {}
): SchemaFragment<AnyOfOut<T>> => {
  const baseFragment = {
    toSchema: function (
      this: any,
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema {
      visited = visited || new Map();
      usageMap = usageMap || new Map();
      const any = fragments.map((frag) =>
        resolveInput(frag, visited, usageMap)
      );
      const base: JsonSchemaBase = { anyOf: any, ...options };
      let schema = processCompositionKeys(
        filterInvalidKeywords(base, "anyOf"),
        visited,
        usageMap
      );
      schema = resolveSchemaFragments(schema, visited, usageMap);
      const usageCount = usageMap ? usageMap.get(this) || 0 : 0;
      if (!name && (isSimpleSchema(schema) || usageCount <= 1)) {
        return schema;
      }
      if (visited.has(this)) {
        return { $ref: visited.get(this)! };
      }
      const id = name ? `urn:loom:${name}` : getSchemaId(schema);
      visited.set(this, id);
      return name ? wrapWithName(schema, name) : { ...schema, $id: id };
    },
    validate: async function () {
      throw new Error("validate method not attached");
    },
  };
  return withValidation<AnyOfOut<T>, typeof baseFragment>(baseFragment);
};

export const oneOf = <T extends readonly SchemaFragment<any>[]>(
  fragments: T,
  options: Partial<BaseSchemaOptions> = {}
): SchemaFragment<T[number] extends SchemaFragment<infer U> ? U : never> => {
  const baseFragment = {
    toSchema: function (
      this: any,
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema {
      visited = visited || new Map();
      usageMap = usageMap || new Map();
      const one = fragments.map((frag) =>
        resolveInput(frag, visited, usageMap)
      );
      const base: JsonSchemaBase = { oneOf: one, ...options };
      let schema = processCompositionKeys(
        filterInvalidKeywords(base, "oneOf"),
        visited,
        usageMap
      );
      schema = resolveSchemaFragments(schema, visited, usageMap);
      const usageCount = usageMap ? usageMap.get(this) || 0 : 0;
      if (!name && (isSimpleSchema(schema) || usageCount <= 1)) {
        return schema;
      }
      if (visited.has(this)) {
        return { $ref: visited.get(this)! };
      }
      const id = name ? `urn:loom:${name}` : getSchemaId(schema);
      visited.set(this, id);
      return name ? wrapWithName(schema, name) : { ...schema, $id: id };
    },
    validate: async function () {
      throw new Error("validate method not attached");
    },
  };
  return withValidation<
    T[number] extends SchemaFragment<infer U> ? U : never,
    typeof baseFragment
  >(baseFragment);
};

export const conditional = (
  {
    if: ifFragment,
    then: thenFragment,
    else: elseFragment,
  }: {
    if: JsonSchemaInput;
    then: JsonSchemaInput;
    else: JsonSchemaInput;
  },
  options: Partial<BaseSchemaOptions> = {}
): SchemaFragment<any> => {
  const baseFragment = {
    toSchema: function (
      this: any,
      name?: string,
      visited?: Map<SchemaFragment<any>, string>,
      usageMap?: Map<SchemaFragment<any>, number>
    ): JsonSchema {
      visited = visited || new Map();
      usageMap = usageMap || new Map();
      const ifSchema = resolveInput(ifFragment, visited, usageMap);
      const thenSchema = resolveInput(thenFragment, visited, usageMap);
      const elseSchema = resolveInput(elseFragment, visited, usageMap);
      let schema = {
        if: ifSchema,
        then: thenSchema,
        else: elseSchema,
        ...options,
      };
      schema = resolveSchemaFragments(schema, visited, usageMap);
      const usageCount = usageMap ? usageMap.get(this) || 0 : 0;
      if (!name && (isSimpleSchema(schema) || usageCount <= 1)) {
        return schema;
      }
      if (visited.has(this)) {
        return { $ref: visited.get(this)! };
      }
      const id = name ? `urn:loom:${name}` : getSchemaId(schema);
      visited.set(this, id);
      return name ? wrapWithName(schema, name) : { ...schema, $id: id };
    },
    validate: async function () {
      throw new Error("validate method not attached");
    },
  };
  return withValidation<any, typeof baseFragment>(baseFragment);
};
