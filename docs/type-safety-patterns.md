# TypeScript Type Safety Patterns - Architecture Guidelines

## 🎯 Standard Component Patterns

### Base Component Interface
```typescript
// src/types/component-patterns.ts
export interface BaseComponentProps {
  className?: string | undefined;
  children?: React.ReactNode | undefined;
  'data-testid'?: string | undefined;
  id?: string | undefined;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean | undefined;
  'aria-label'?: string | undefined;
}
```

### Event Handler Patterns
```typescript
// Generic event handler types for exactOptionalPropertyTypes compliance
export type EventHandler<T = void> = (value: T) => void;
export type OptionalEventHandler<T = void> = ((value: T) => void) | undefined;

// Usage examples
interface ButtonProps extends InteractiveComponentProps {
  onClick?: OptionalEventHandler<React.MouseEvent>;
  variant?: ('primary' | 'secondary' | 'ghost') | undefined;
}

interface SelectProps extends InteractiveComponentProps {
  onValueChange?: OptionalEventHandler<string>;
  value?: string | undefined;
}
```

## 🔧 Null Safety Patterns

### Type Guards
```typescript
// Universal null/undefined checking
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

// Usage in components
function processValue(input: string | undefined): string {
  if (!isDefined(input)) {
    return 'default-value';
  }
  // input is now safely typed as string
  return input.toUpperCase();
}
```

### Safe Access Patterns
```typescript
// Replace unsafe property access
// BEFORE (unsafe):
const result = obj.nested.property;

// AFTER (safe):
const result = obj?.nested?.property ?? 'fallback';

// For arrays
const firstItem = items?.[0] ?? null;

// For function calls
const result = callback?.() ?? defaultValue;
```

## 📦 Module Export Patterns

### Standardized Index Files
```typescript
// src/components/ui/index.ts
export { Button } from './button';
export type { ButtonProps } from './button';

export { Card, CardContent, CardHeader, CardTitle } from './card';
export type { CardProps } from './card';

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export type { SelectProps } from './select';
```

### Component File Structure
```typescript
// Standard component file pattern
import * as React from 'react';
import { cn } from '@/utils/cn';
import type { BaseComponentProps } from '@/types/component-patterns';

export interface ComponentNameProps extends BaseComponentProps {
  // Component-specific props
}

export function ComponentName({
  className,
  children,
  ...props
}: ComponentNameProps) {
  return (
    <div className={cn('component-base-styles', className)} {...props}>
      {children}
    </div>
  );
}

// Named export for flexibility
export default ComponentName;
```

## 🎨 UI Component Specific Patterns

### Dialog/Modal Components
```typescript
interface DialogProps extends BaseComponentProps {
  open?: boolean | undefined;
  onOpenChange?: OptionalEventHandler<boolean>;
  modal?: boolean | undefined;
}

// Implementation with proper default handling
export function Dialog({
  open = false,
  onOpenChange,
  modal = true,
  children,
  className
}: DialogProps) {
  const handleOpenChange = onOpenChange ?? (() => {});
  // Implementation...
}
```

### Form Input Components
```typescript
interface InputProps extends InteractiveComponentProps {
  type?: ('text' | 'email' | 'password' | 'number') | undefined;
  placeholder?: string | undefined;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: OptionalEventHandler<React.ChangeEvent<HTMLInputElement>>;
  onBlur?: OptionalEventHandler<React.FocusEvent<HTMLInputElement>>;
}
```

### Select/Choice Components
```typescript
interface SelectProps extends BaseComponentProps {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: OptionalEventHandler<string>;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
}

// Type-safe value handling
function handleValueChange(value: string) {
  if (isNotNullish(onValueChange)) {
    onValueChange(value);
  }
}
```

## 🔄 State Management Patterns

### React State with TypeScript
```typescript
// Type-safe useState patterns
const [state, setState] = useState<StateType | undefined>(undefined);

// With default values
const [config, setConfig] = useState<Config>(() => defaultConfig);

// For complex state
interface FormState {
  values: Record<string, string>;
  errors: Record<string, string | undefined>;
  isValid: boolean;
}

const [form, setForm] = useState<FormState>({
  values: {},
  errors: {},
  isValid: false
});
```

### Reducer Patterns
```typescript
interface Action {
  type: string;
  payload?: any;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPDATE_VALUE':
      return { ...state, value: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}
```

## 🚨 Error Handling Patterns

### Result/Error Types
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
async function fetchData(): Promise<Result<Data>> {
  try {
    const data = await api.getData();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Safe Function Execution
```typescript
function safeExecute<T>(
  fn: () => T,
  fallback: T
): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// Usage
const result = safeExecute(() => JSON.parse(data), {});
```

## 🧪 Testing Patterns

### Component Testing Types
```typescript
// Test props interface
interface TestComponentProps {
  testId?: string;
  mockHandlers?: {
    onClick?: jest.Mock;
    onChange?: jest.Mock;
  };
}

// Type-safe test utilities
function createMockProps<T extends object>(overrides: Partial<T>): T {
  return { ...defaultProps, ...overrides } as T;
}
```

## 📋 Implementation Checklist

### Phase 1 - Foundation
- [ ] Create `BaseComponentProps` interface
- [ ] Implement event handler type patterns  
- [ ] Add null safety type guards
- [ ] Update `types/index.ts` with new patterns

### Phase 2 - Component Updates  
- [ ] Update all UI components to use base interfaces
- [ ] Fix exactOptionalPropertyTypes violations
- [ ] Implement proper event handler typing
- [ ] Add null checks where needed

### Phase 3 - Module Organization
- [ ] Standardize all index.ts export files
- [ ] Create missing component exports
- [ ] Fix import/export resolution errors
- [ ] Update path mappings if needed

### Phase 4 - Quality & Safety
- [ ] Remove unused imports and variables
- [ ] Add explicit return types
- [ ] Implement comprehensive null safety
- [ ] Add automated type checking

## 🎯 Success Validation

### Type Check Commands
```bash
# Full type checking
npm run typecheck

# Watch mode for development  
npm run typecheck:watch

# Specific file checking
npx tsc --noEmit src/components/ui/button.tsx

# Generate type coverage report
npx typescript-coverage-report
```

### Quality Metrics
- 0 TypeScript errors
- 95%+ type coverage on critical paths
- All component props properly typed
- All event handlers type-safe
- No null/undefined runtime errors

This pattern library ensures consistent, type-safe component development across the entire codebase.