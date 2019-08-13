# Changelog

## 0.3.0 - 2019-08-13

The conversion logic has been split off from stadt into `stadt-converter`,
meaning that `stadt` proper only contains definitions for the objects
representing types, as well as JSON conversion logic. There are no changes to
the individual APIs.

We did this so you can depend on `stadt` itself without having to worry about
requiring TypeScript.

## 0.2.0 - 2019-07-31

`stadt.Type` now has the following methods:

- `isLiteral`, `isTypeof`, etc.
- `mustSatisfy`, which takes in a type predicate (i.e., a function from types to
  booleans) and returns whether the type _must_ satisfy that predicate, taking
  into account unions/intersections. See the documentation for what exactly
  that means.

This also contains a non-backwards-compatible change: `isString` and `isNumber`
now return true both on literals and non-literals.

## 0.1.0 - 2019-06-11

Initial release.
