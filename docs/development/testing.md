# Testing

mkv2castUI has comprehensive test suites for both backend and frontend components.

## Test Overview

| Component | Framework | Coverage |
|-----------|-----------|----------|
| Backend (Django) | pytest | ~85% |
| Frontend (React) | Jest + Testing Library | ~80% |
| E2E | Playwright | Key flows |

## Backend Tests

### Running Tests

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov=accounts --cov=conversions --cov-report=html

# Run specific test file
pytest tests/accounts/test_views.py

# Run specific test
pytest tests/accounts/test_views.py::test_login_view

# Verbose output
pytest -v

# Show print statements
pytest -s
```

### Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── accounts/
│   ├── test_admin_endpoints.py
│   ├── test_auth_endpoints.py
│   ├── test_authentication.py
│   ├── test_models.py
│   ├── test_permissions.py
│   └── test_views.py
├── conversions/
│   ├── test_consumers.py
│   ├── test_models.py
│   ├── test_tasks.py
│   └── test_views.py
└── integration/
    └── test_full_conversion.py
```

### Key Test Files

#### test_views.py (Accounts)
```python
import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestAuthEndpoints:
    def test_login_success(self, api_client, user):
        """Test successful login"""
        response = api_client.post(reverse('login'), {
            'username': 'testuser',
            'password': 'testpass123'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data

    def test_login_invalid_credentials(self, api_client):
        """Test login with wrong password"""
        response = api_client.post(reverse('login'), {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

#### test_tasks.py (Conversions)
```python
import pytest
from unittest.mock import patch, MagicMock
from conversions.tasks import convert_video

@pytest.mark.django_db
class TestConversionTask:
    @patch('conversions.tasks.Mkv2Cast')
    def test_successful_conversion(self, mock_mkv2cast, job):
        """Test video conversion completes successfully"""
        mock_converter = MagicMock()
        mock_mkv2cast.return_value = mock_converter
        mock_converter.convert.return_value = '/output/video.mkv'
        
        result = convert_video(str(job.id))
        
        assert result['status'] == 'completed'
        job.refresh_from_db()
        assert job.status == 'completed'
```

### Coverage Report

```bash
# Generate HTML coverage report
pytest --cov=accounts --cov=conversions --cov-report=html

# Open report
open htmlcov/index.html
```

Current coverage results:

| Module | Statements | Coverage |
|--------|------------|----------|
| accounts/models.py | 45 | 92% |
| accounts/views.py | 120 | 88% |
| conversions/tasks.py | 180 | 82% |
| conversions/consumers.py | 95 | 78% |
| **Total** | **850** | **~85%** |

## Frontend Tests

### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (for development)
npm run test:watch

# Run specific test file
npm test -- ConversionOptions.test.tsx
```

### Test Structure

```
frontend/__tests__/
├── components/
│   ├── ConversionOptions.test.tsx
│   ├── FileUploader.test.tsx
│   ├── Header.test.tsx
│   ├── LoginPrompt.test.tsx
│   └── ProgressTracker.test.tsx
├── hooks/
│   ├── useAuthConfig.test.tsx
│   ├── useConversion.test.tsx
│   └── useWebSocket.test.tsx
└── lib/
    ├── api.test.ts
    └── i18n.test.ts
```

### Example Tests

#### FileUploader.test.tsx
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploader } from '@/components/FileUploader';

describe('FileUploader', () => {
  it('renders drop zone', () => {
    render(<FileUploader onFilesSelected={jest.fn()} lang="en" />);
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });

  it('accepts MKV files', async () => {
    const onFilesSelected = jest.fn();
    render(<FileUploader onFilesSelected={onFilesSelected} lang="en" />);
    
    const file = new File(['video'], 'test.mkv', { type: 'video/x-matroska' });
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, file);
    
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('rejects non-MKV files', async () => {
    const onFilesSelected = jest.fn();
    render(<FileUploader onFilesSelected={onFilesSelected} lang="en" />);
    
    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, file);
    
    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
```

#### useWebSocket.test.tsx
```typescript
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import WS from 'jest-websocket-mock';

describe('useWebSocket', () => {
  let server: WS;

  beforeEach(() => {
    server = new WS('ws://localhost:8080/ws/conversion/123/');
  });

  afterEach(() => {
    WS.clean();
  });

  it('connects to WebSocket', async () => {
    const { result } = renderHook(() => useWebSocket('123'));
    
    await server.connected;
    
    expect(result.current.connected).toBe(true);
  });

  it('receives progress updates', async () => {
    const { result } = renderHook(() => useWebSocket('123'));
    
    await server.connected;
    
    act(() => {
      server.send(JSON.stringify({
        type: 'progress',
        progress: 50
      }));
    });
    
    expect(result.current.progress).toBe(50);
  });
});
```

### Coverage Report

```bash
npm run test:coverage
```

Coverage is output to `coverage/lcov-report/index.html`.

Current coverage:

| Component | Statements | Coverage |
|-----------|------------|----------|
| FileUploader | 45 | 95% |
| ConversionOptions | 80 | 88% |
| ProgressTracker | 60 | 82% |
| useWebSocket | 35 | 90% |
| **Total** | **400** | **~80%** |

## E2E Tests

### Running E2E Tests

```bash
cd e2e

# Install Playwright browsers
npx playwright install

# Run tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test auth.spec.ts

# Generate report
npx playwright show-report
```

### Test Files

```
e2e/tests/
├── auth.spec.ts        # Authentication flows
├── conversion.spec.ts  # Video conversion
├── history.spec.ts     # History page
├── navigation.spec.ts  # Navigation tests
└── upload.spec.ts      # File upload tests
```

### Example E2E Test

```typescript
// conversion.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Video Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
  });

  test('converts video file', async ({ page }) => {
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=browse to upload');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/sample.mkv');

    // Verify file appears
    await expect(page.locator('text=sample.mkv')).toBeVisible();

    // Start conversion
    await page.click('text=Start Conversion');

    // Wait for progress
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // Wait for completion (with timeout)
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 120000 });

    // Download should be available
    await expect(page.locator('text=Download')).toBeVisible();
  });
});
```

## CI/CD Integration

Tests run automatically on GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -r requirements.txt
          pytest --cov --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: |
          cd frontend
          npm ci
          npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose up -d
      - uses: actions/setup-node@v4
      - run: |
          cd e2e
          npm ci
          npx playwright install --with-deps
          npx playwright test
```

## Writing Tests

### Best Practices

1. **Isolate tests** - Each test should be independent
2. **Use fixtures** - Share setup code with pytest fixtures or beforeEach
3. **Mock external services** - Don't hit real APIs in unit tests
4. **Test edge cases** - Include error conditions and boundaries
5. **Keep tests fast** - Unit tests should run in milliseconds

### Adding New Tests

1. Create test file following naming convention: `test_*.py` or `*.test.tsx`
2. Import testing utilities
3. Write test functions/classes
4. Run tests locally before committing
5. Ensure CI passes

See {doc}`contributing` for more details on the development workflow.
