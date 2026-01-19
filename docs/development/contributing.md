# Contributing

Thank you for your interest in contributing to mkv2castUI! This guide will help you get started.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all skill levels.

## Getting Started

### 1. Fork and Clone

```bash
# Fork via GitHub UI, then:
git clone https://github.com/YOUR_USERNAME/mkv2castUI.git
cd mkv2castUI
git remote add upstream https://github.com/voldardard/mkv2castUI.git
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Set Up Development Environment

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### 4. Make Changes

Follow our coding standards (see below).

### 5. Test Your Changes

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### 6. Commit

```bash
git add .
git commit -m "feat: add awesome feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance

### 7. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Development Guidelines

### Python (Backend)

**Style:**
- PEP 8 compliant
- Black formatter (line length 88)
- isort for imports

**Example:**
```python
from django.db import models
from rest_framework import serializers

from .models import ConversionJob


class ConversionJobSerializer(serializers.ModelSerializer):
    """Serializer for conversion jobs."""
    
    class Meta:
        model = ConversionJob
        fields = ['id', 'filename', 'status', 'progress']
    
    def validate_filename(self, value: str) -> str:
        """Validate that filename is an MKV file."""
        if not value.lower().endswith('.mkv'):
            raise serializers.ValidationError("Only MKV files are supported")
        return value
```

**Tools:**
```bash
# Format
black .
isort .

# Lint
flake8

# Type check
mypy .
```

### TypeScript/React (Frontend)

**Style:**
- ESLint + Prettier
- Functional components with hooks
- TypeScript strict mode

**Example:**
```typescript
import { useState, useEffect } from 'react';

interface Props {
  jobId: string;
  lang: string;
}

export function ProgressTracker({ jobId, lang }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const ws = new WebSocket(`/ws/conversion/${jobId}/`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
    };

    return () => ws.close();
  }, [jobId]);

  return (
    <div className="progress-tracker">
      <div 
        className="progress-bar" 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

**Tools:**
```bash
# Lint
npm run lint

# Type check
npm run type-check

# Format
npm run format
```

### Git Workflow

1. Keep commits atomic and focused
2. Rebase on main before creating PR
3. Squash commits if needed
4. Write meaningful commit messages

### Testing Requirements

- All new features need tests
- Bug fixes should include regression tests
- Maintain or improve coverage

**Backend coverage target:** 80%+
**Frontend coverage target:** 75%+

## Pull Request Process

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention
- [ ] No merge conflicts

### Review Process

1. Automated checks run (tests, lint, build)
2. Maintainer reviews code
3. Address feedback
4. Approval and merge

### What to Expect

- First review within 3-5 days
- May request changes
- Be patient - maintainers are volunteers

## Types of Contributions

### Bug Fixes

1. Check if issue exists
2. Create issue if not
3. Reference issue in PR

### New Features

1. Open issue for discussion first
2. Wait for approval before coding
3. Follow design decisions

### Documentation

- Fix typos
- Add examples
- Improve clarity
- Translate content

### Testing

- Add missing tests
- Improve test quality
- Add E2E tests

## Development Environment

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend frontend

# Rebuild after changes
docker-compose build backend
docker-compose up -d backend
```

### Local Development

**Backend:**
```bash
cd backend
source venv/bin/activate
export DJANGO_DEBUG=True
export DATABASE_URL=sqlite:///db.sqlite3
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Celery:**
```bash
cd backend
celery -A mkv2cast_api worker -l debug
```

## Getting Help

- **Questions:** GitHub Discussions
- **Bugs:** GitHub Issues
- **Chat:** Discord (link in README)

## Recognition

Contributors are:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Appreciated! 🙏

## License

By contributing, you agree that your contributions will be licensed under the project's BSL 1.1 license.
