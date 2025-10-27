# E2E Testing with Playwright

End-to-end tests for the cjhirashi-agents application using Playwright.

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Show test report
npm run test:e2e:report
```

## Test Files

- **homepage.spec.ts** - Homepage navigation and responsiveness
- **dashboard.spec.ts** - Dashboard access and functionality (requires auth)
- **tasks.spec.ts** - Task management / Kanban board (requires auth)
- **accessibility.spec.ts** - WCAG compliance and a11y testing

## Authentication Tests

Most tests require authentication. Currently these are skipped with `test.skip()`.

To enable authenticated tests, you need to:

1. Create a test user in your database
2. Implement login flow in a setup file
3. Store session/cookies for reuse
4. Remove `test.skip()` from authenticated tests

Example setup:

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/api/auth/signin');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Save auth state
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

Then use in playwright.config.ts:

```typescript
{
  name: 'authenticated',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'playwright/.auth/user.json'
  },
  dependencies: ['setup']
}
```

## Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Keep tests independent** - each test should be self-contained
3. **Use proper waits** - await page.waitForLoadState(), not arbitrary timeouts
4. **Clean up test data** - delete created entities after tests
5. **Test user flows** - not individual components (that's unit testing)

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries on failure
- Single worker (sequential execution)
- JSON report output for analysis

## Debugging

```bash
# Run with debug mode
PWDEBUG=1 npm run test:e2e

# Run specific test file
npx playwright test tasks.spec.ts

# Run tests matching pattern
npx playwright test --grep "should create"
```

## Coverage

Current coverage:
- ✅ Homepage navigation
- ✅ Responsive design testing
- ✅ Accessibility (WCAG)
- ⏳ Dashboard (needs auth)
- ⏳ Task CRUD (needs auth)
- ⏳ Chat functionality (needs auth)
- ⏳ Image generation (needs auth)

## Related Documentation

- [Playwright Docs](https://playwright.dev)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
