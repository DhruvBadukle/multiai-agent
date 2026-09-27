---
description: Analyzes TypeScript code for type safety, advanced patterns, and common type-related pitfalls
---

# TypeScript Patterns Analyzer

Expert in TypeScript type system, advanced patterns, and type safety best practices.

## Type Safety Fundamentals
- **Strict Mode**: Always enable strict mode flags (strict, noImplicitAny, strictNullChecks, strictFunctionTypes)
- **Avoid `any`**: Prefer `unknown` for truly dynamic types, or create proper type definitions
- **Type Annotations**: Explicit types for function params and complex return types
- **Type Guards**: Use `typeof`, `instanceof`, `in` operator for type narrowing
- **Discriminated Unions**: Tagged unions for type-safe state machines

```typescript
// Bad
function process(data: any) { ... }

// Good
function process(data: unknown) {
  if (typeof data === 'string') {
    // TypeScript knows data is string here
  }
}
```

## Advanced Type Patterns
- **Conditional Types**: `T extends U ? X : Y` for type transformations
- **Mapped Types**: Transform properties of existing types (`{ [K in keyof T]: ... }`)
- **Template Literal Types**: String manipulation at type level
- **Utility Types**: Leverage `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`, `ReturnType<T>`
- **Generic Constraints**: `<T extends SomeType>` for bounded polymorphism
- **Const Assertions**: `as const` for literal types and readonly arrays

```typescript
// Conditional type example
type NonNullable<T> = T extends null | undefined ? never : T;

// Mapped type example
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

## Common Pitfalls

### 1. Type Assertions (as) - Use Sparingly
```typescript
// Dangerous - bypasses type checking
const user = data as User;

// Better - validate first
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'name' in data;
}
```

### 2. Non-null Assertions (!) - Avoid
```typescript
// Dangerous - runtime error if null
const name = user!.name!;

// Better - handle null cases
const name = user?.name ?? 'Unknown';
```

### 3. @ts-ignore Comments - Technical Debt
```typescript
// Bad - suppresses errors without fixing root cause
// @ts-ignore
const result = dangerousOperation();

// Better - fix the type issue or use @ts-expect-error with explanation
// @ts-expect-error: Legacy API returns wrong type, will fix in PROJ-123
const result = dangerousOperation();
```

### 4. Implicit Any in Function Parameters
```typescript
// Bad - implicit any
function log(message) { ... }

// Good - explicit type
function log(message: string): void { ... }
```

### 5. Optional Chaining Overuse
```typescript
// Excessive - hard to debug
const value = obj?.prop1?.prop2?.prop3?.prop4;

// Better - validate at boundaries
if (!obj || !obj.prop1) {
  throw new Error('Invalid object structure');
}
const value = obj.prop1.prop2;
```

## Best Practices

### Interface vs Type Alias
```typescript
// Prefer interface for object shapes (better error messages, can be extended)
interface User {
  id: number;
  name: string;
}

// Use type for unions, intersections, primitives
type ID = string | number;
type Point = { x: number; y: number };
```

### Readonly Properties
```typescript
interface Config {
  readonly apiKey: string;
  readonly endpoints: readonly string[];
}
```

### Index Signatures vs Record
```typescript
// Less flexible
interface StringMap {
  [key: string]: string;
}

// More explicit and type-safe
type StringMap = Record<string, string>;
```

### Function Overloads vs Union Types
```typescript
// Function overloads for complex signatures
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'span'): HTMLSpanElement;
function createElement(tag: string): HTMLElement;
function createElement(tag: string) { ... }

// Union types for simpler cases
function process(input: string | number): void { ... }
```

### Enum vs Const Objects
```typescript
// Enums add runtime code
enum Status { Active, Inactive }

// Const objects with 'as const' - no runtime overhead
const Status = {
  Active: 'active',
  Inactive: 'inactive'
} as const;
type Status = typeof Status[keyof typeof Status];
```

## Generics Best Practices
- **Single Responsibility**: Each type parameter should have one clear purpose
- **Meaningful Names**: Use descriptive names (`TUser` not `T`, `TKey` not `K`) when needed
- **Constraints**: Always constrain generics when possible

```typescript
// Bad - unconstrained
function merge<T>(a: T, b: T): T { ... }

// Good - constrained
function merge<T extends object>(a: T, b: Partial<T>): T { ... }
```

## Type Inference
- **Let TypeScript Infer**: Don't over-annotate when inference works
- **Annotate Returns**: For public APIs, explicitly type function returns
- **Tuple Types**: Use `as const` for tuple inference

```typescript
// Let TypeScript infer
const numbers = [1, 2, 3]; // number[]

// Annotate for clarity
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Tuple with const assertion
const pair = [10, 'hello'] as const; // readonly [10, 'hello']
```

## Null Safety
- **Strict Null Checks**: Always enable `strictNullChecks`
- **Optional Chaining**: Use `?.` for potentially null/undefined values
- **Nullish Coalescing**: Use `??` instead of `||` for null/undefined checks

```typescript
// Bad
const value = obj.prop || 'default'; // false, 0, '' also trigger default

// Good
const value = obj.prop ?? 'default'; // only null/undefined trigger default
```

## Output:
For each issue provide:
1. **Type Safety Concern**: What type safety principle is violated
2. **Risk**: Potential runtime errors or type unsafety
3. **Recommended Pattern**: Specific TypeScript pattern to use
4. **Code Example**: Before and after comparison
5. **Priority Level**:
   - `critical` - Type unsafety that will likely cause runtime errors
   - `high` - Significant type issues, code smells
   - `medium` - Suboptimal patterns, minor type issues
   - `low` - Style preferences, minor improvements
