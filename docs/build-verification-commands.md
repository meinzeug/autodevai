# Build Verification Commands

This document provides comprehensive test commands to verify the AutoDev-AI Neural Bridge Platform build integrity across all project components.

## Quick Test Summary

Based on the analysis of the current codebase, here's the status of each verification component:

### 🚨 Critical Issues Found

1. **TypeScript Compilation**: ❌ **FAILED** (150+ type errors)
2. **ESLint Validation**: ❌ **FAILED** (377 errors, 192 warnings)
3. **Rust Compilation**: ❌ **FAILED** (101+ compilation errors)
4. **Tauri CLI**: ❌ **MISSING** (tauri command not found)

### ⚠️ Warnings

1. **npm Tests**: ⚠️ **PARTIAL** (92 failed, 89 passed out of 185 tests)
2. **Package Dependencies**: ⚠️ **ISSUES** (Several extraneous packages)

## Individual Test Commands

### 1. TypeScript Compilation
```bash
# Build project (includes TypeScript compilation)
npm run build

# Expected: Clean compilation without errors
# Current Status: ❌ FAILED - 150+ type errors detected
```

### 2. TypeScript Type Checking
```bash
# Run type checking without emitting files
npm run typecheck

# Expected: No type errors
# Current Status: ❌ FAILED - Same type errors as build
```

### 3. ESLint Validation
```bash
# Run ESLint with zero tolerance for warnings
npm run lint

# Expected: No errors or warnings
# Current Status: ❌ FAILED - 377 errors, 192 warnings
```

### 4. Rust Compilation Check
```bash
# Check Rust compilation without building
cd src-tauri && cargo check

# Expected: Clean compilation
# Current Status: ❌ FAILED - 101+ compilation errors
```

### 5. Rust Test Suite
```bash
# Run Rust tests
cd src-tauri && cargo test

# Expected: All tests pass
# Current Status: ❌ FAILED - Compilation errors prevent testing
```

### 6. npm Test Suite
```bash
# Run all tests
npm test

# Run tests without watch mode
npm run test:run

# Expected: All tests pass
# Current Status: ⚠️ PARTIAL - 92 failed, 89 passed
```

### 7. Package Dependencies
```bash
# Check package dependencies
npm ls --depth=0

# Expected: Clean dependency tree
# Current Status: ⚠️ ISSUES - Extraneous packages detected
```

### 8. Tauri Build Check
```bash
# Check if Tauri CLI is available
tauri --version

# Expected: Tauri CLI version output
# Current Status: ❌ MISSING - Command not found
```

## Automated Test Scripts

### Sequential Testing
```bash
# Run comprehensive sequential tests
./scripts/build-verification.sh
```

### Parallel Testing (Faster)
```bash
# Run tests in parallel for faster execution
./scripts/parallel-build-verification.sh
```

## Quick Parallel Verification Commands

For immediate verification, run these commands in parallel terminals:

```bash
# Terminal 1: TypeScript
npm run build & npm run typecheck &

# Terminal 2: Code Quality
npm run lint &

# Terminal 3: Rust Backend
cd src-tauri && cargo check && cargo test &

# Terminal 4: Frontend Tests
npm run test:run &

# Terminal 5: Dependencies
npm ls --depth=0 &
```

## Test Coverage Analysis

### Vitest Coverage
```bash
# Generate test coverage report
npm run test:coverage

# View coverage report
npx vite preview --outDir tests/coverage
```

### Performance Testing
```bash
# Run performance benchmarks
npm run test:performance

# Run specific performance tests
npm run test:load
npm run test:stress
npm run test:memory
```

### Security Testing
```bash
# Run security test suite
npm run test:security

# Run security demo
npm run test:security:demo
```

## Expected Results vs Current Status

| Test Component | Expected | Current Status | Priority |
|----------------|----------|----------------|----------|
| TypeScript Build | ✅ Pass | ❌ 150+ errors | 🚨 Critical |
| TypeScript Types | ✅ Pass | ❌ Type errors | 🚨 Critical |
| ESLint | ✅ Pass | ❌ 569 issues | 🚨 Critical |
| Rust Compilation | ✅ Pass | ❌ 101+ errors | 🚨 Critical |
| Rust Tests | ✅ Pass | ❌ Can't run | 🚨 Critical |
| npm Tests | ✅ Pass | ⚠️ 50% pass rate | ⚠️ High |
| Dependencies | ✅ Clean | ⚠️ Extraneous | ⚠️ Medium |
| Tauri CLI | ✅ Available | ❌ Missing | ⚠️ Medium |

## Fixing Critical Issues

### 1. TypeScript Issues
The main TypeScript issues stem from:
- `exactOptionalPropertyTypes: true` in tsconfig.json
- Missing null checks and undefined handling
- Index signature access violations

### 2. ESLint Issues
- Unused variables and imports
- Missing dependency arrays in useEffect hooks
- Code quality warnings

### 3. Rust Issues
- Missing type definitions (DockerContainer, LogEntry)
- Macro syntax errors
- Borrowing and ownership issues
- Missing trait implementations

### 4. Test Issues
- Vitest configuration conflicts
- Mock setup problems
- DOM testing environment issues

## Immediate Action Plan

1. **Fix TypeScript compilation** (Critical)
   - Address null/undefined handling
   - Fix index signature access
   - Resolve type mismatches

2. **Fix Rust compilation** (Critical)
   - Define missing types
   - Fix macro syntax
   - Resolve ownership issues

3. **Install Tauri CLI** (Medium)
   ```bash
   cargo install tauri-cli
   ```

4. **Clean up dependencies** (Medium)
   ```bash
   npm prune
   npm install
   ```

5. **Fix test configuration** (High)
   - Resolve Vitest setup issues
   - Fix mock conflicts
   - Address test environment problems

## Performance Benchmarks

When tests are passing, these benchmarks should be met:

- **Build time**: < 60 seconds
- **Type checking**: < 30 seconds
- **Lint checking**: < 15 seconds
- **Test execution**: < 120 seconds
- **Rust compilation**: < 180 seconds

## Continuous Integration

These commands should be integrated into CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Build Verification
  run: |
    npm ci
    npm run typecheck
    npm run lint
    npm run build
    npm run test:run
    cd src-tauri && cargo check && cargo test
```

## Conclusion

The project currently has significant build integrity issues that must be addressed before deployment. The automated scripts provide comprehensive testing, but manual fixes are required for the critical TypeScript and Rust compilation errors.