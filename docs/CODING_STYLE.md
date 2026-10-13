# Coding Style

## Naming
- Booleans read as predicates: `isReady`, `hasAccess`, `shouldRetry`
- Names describe meaning, not type or position

## Comments
- Explain why, not what
- Delete comments that restate the code
- No commented-out code

## Errors
- Never swallow errors silently
- Throw `Error` subclasses with a message stating what failed and what was expected
- Handle at boundaries (CLI, HTTP, jobs); let internals propagate

## Consistency
- Match the surrounding file before applying personal preference
- Strict TypeScript: no `any`, no non-null `!` without a comment
