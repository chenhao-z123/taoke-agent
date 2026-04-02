# Contributing to Campus Energy Optimizer

Thank you for your interest in contributing to the Campus Energy Optimizer project! This document provides guidelines for contributing code, documentation, and other improvements.

## Documentation Structure

We maintain documentation in both English and Chinese. The structure follows this pattern:

```
docs/
├── en/                    # English documentation
│   ├── architecture/      # System architecture and design decisions
│   ├── technical-specifications/  # Complete technical specifications
│   ├── development-process/       # Development handoff documents (dated)
│   └── issue-archive/     # Issue tracking (resolved/partially resolved/unresolved)
└── zh/                    # Chinese documentation (mirroring English structure)
    ├── architecture/
    ├── technical-specifications/
    ├── development-process/
    └── issue-archive/
```

### Adding New Documentation

1. **Create content in English first**: All technical documentation should start in English
2. **Place in appropriate category**: 
   - Architecture decisions → `docs/en/architecture/`
   - Technical specifications → `docs/en/technical-specifications/`
   - Development handoffs → `docs/en/development-process/` (use date prefix like `handoff-2026-04-02-description.md`)
   - Issues → `docs/en/issue-archive/` (use status suffix like `issue-name-resolved.md`)
3. **Translate to Chinese**: Create corresponding Chinese version in `docs/zh/` with same filename
4. **Use consistent naming**: Keep filenames consistent between languages for easy maintenance

### Development Process Documents

- Name format: `handoff-YYYY-MM-DD-description.md`
- Content: Focus on what was completed, current state, remaining work, and next steps
- Audience: Future developers continuing the work

### Issue Archive Documents  

- Name format: `issues.md` (single file with sections for different statuses)
- Structure: Organize issues into "Resolved", "Partially Resolved - Deferred", and "Unresolved" sections
- Content: Include problem description, current status, impact, and next steps

## Code Contributions

### Branching Strategy

- Create feature branches from main for significant changes
- Use descriptive branch names (e.g., `feature/llm-integration`, `fix/json-parsing-stability`)

### Commit Messages

Follow conventional commits format:
- `feat: add new feature`
- `fix: resolve issue`
- `docs: update documentation`  
- `chore: maintenance task`

### Testing

- Add tests for new functionality
- Ensure existing tests pass before submitting PR
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build` to verify

## Language Guidelines

### English Documentation
- Use clear, concise technical language
- Avoid idioms and colloquialisms
- Follow standard technical writing conventions

### Chinese Documentation  
- Use standard technical Chinese terminology
- Maintain consistency with English content structure
- Prefer formal over informal language

## Pull Request Process

1. Fork the repository
2. Create your feature branch
3. Commit your changes with clear messages
4. Push to your branch
5. Open a pull request with clear description of changes
6. Reference relevant issues or documentation

## Questions?

If you have questions about contributing, please open an issue or reach out through the project's communication channels.

Thank you for helping make Campus Energy Optimizer better!