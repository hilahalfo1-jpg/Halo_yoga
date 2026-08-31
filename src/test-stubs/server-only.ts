// Vitest stand-in for the `server-only` package (aliased in vitest.config.ts).
// The real package throws when imported outside a React Server environment,
// which would break unit tests of server modules' pure functions.
export {};
