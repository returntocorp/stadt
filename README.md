# `stadt`: a friendly representation of TypeScript types

This package is both:
- a definition of a series of interfaces that represent TypeScript types in a
  format that's amenable for static analysis (the ADT format)
- a library for converting a TypeScript type to ADT format.

This package includes TypeScript as an optional peer dependency: if you don't
install it, you can still get the type definitions, but you won't get any
conversion logic.

## What's in a name?

"stadt" is an anagram of "TS ADT".
