# `stadt`: a friendly representation of TypeScript types

This package is both:

- a definition of a series of interfaces that represent TypeScript types in a
  format that's amenable for static analysis (the ADT format)
- a library for converting a TypeScript type to ADT format.

This package includes TypeScript as an optional peer dependency: if you don't
install it, you can still get the type definitions, but you won't get any
conversion logic.

## Serialization format

stadt's data types use JSON as their serialization mechanism, and so can be
consumed in your language of choice. Some general notes:

- Each serialized type has a `kind` field, the values of which are described by
  the `TypeKind` enum. Typically, a TypeKind of `Foo` will mean that the
  corresponding TypeScript class is `FooType`.

## What's in a name?

"stadt" is an anagram of "TS ADT".
