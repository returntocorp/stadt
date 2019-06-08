[![CircleCI](https://circleci.com/gh/returntocorp/stadt/tree/master.svg?style=svg)](https://circleci.com/gh/returntocorp/stadt/tree/master)

# `stadt`: a friendly representation of TypeScript types

This package is both:

- a definition of a series of interfaces that represent TypeScript types in a
  format that's amenable for static analysis (the ADT format)
- a library for converting a TypeScript type to ADT format.

This package includes TypeScript as an optional peer dependency: if you don't
install it, you can still get the type definitions, but you won't get any
conversion logic.

## Why does this exist?

To help make static analysis of JavaScript and TypeScript easier to write as
part of the [r2c](https://returntocorp.com/) analysis platform. Check out our
site if that sounds like something you'd be interested in!

## What's supported?

Currently supported:

- String and numeric literal types
- All primitive types (including unique symbol types\*\*
- Object literals
- Union and intersection types
- Types of classes and interfaces
- Figuring out the package and file name that a type is defined in
- Fallback 'untranslated' type serialization that just embeds the type signature
  as a string
- Generics

**Not** supported:

- The handling around recursive types (certain kinds of prototypes that have
  methods that return `this`) is still a little weird.
- Boolean literals
- Any actual logic for answering questions such as 'if I call this function with
  these arguments, what's the return type?'

## Serialization format

stadt's data types use JSON as their serialization mechanism, and so can be
consumed in your language of choice. See `src/json.ts` for documentation on what
the data types look like, and see `src/adt.ts` for documentation on what the
corresponding fields mean.

## Demo

To try stadt out for yourself, clone it and run `npm install`, then run `node ./dist/src/coverage.js /path/to/some/file`. For example, running it on the
source file for the 'coverage' binary itself gives:

```
Array.push @ 1290 : (...items: { ts: Type; position: number; text: string; adt: Type; }[]) => number ➡
    ObjectType {
      kind: 'object',
      properties: Map {},
      callSignatures:
       [ { parameters:
            [ { name: 'items',
                type:
                 NominativeType {
                   kind: 'nominative',
                   name: 'Array',
                   fullyQualifiedName:
                    { builtin: true,
                      fileName: undefined,
                      packageName: undefined,
                      name: 'Array' },
                   typeArguments: [ [ObjectType] ] } } ],
           returnType: PrimitiveType { kind: 'number' } } ] }

"util".inspect @ 2292 : typeof inspect ➡
    NominativeType {
      kind: 'nominative',
      name: 'inspect',
      fullyQualifiedName:
       { builtin: false,
         fileName: 'util.d.ts',
         packageName: '@types/node',
         name: 'inspect' },
      typeArguments: [] }

[...]
```

The output contains a serialized version of each AST node, its position, its type as stringified by TypeScript, and the output as a stadt object.

## What's in a name?

"stadt" is an anagram of "TS ADT".
