# Contributing to Terminal Dungeon

Thank you for your interest in contributing to Terminal Dungeon!

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version)
   - Terminal output/error messages

### Suggesting Features

1. Check existing issues and discussions
2. Open a new issue with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach

### Creating Decks

New decks are welcome! Follow these guidelines:

1. Use the YAML schema in `shared/schemas.ts`
2. Create file in `decks/doors/` or `decks/treasures/`
3. Run `npm run deckcheck` to validate
4. Ensure proper tier distribution:
   - Tier 1: Levels 1-5 (Monsters) or +1 to +3 (Items)
   - Tier 2: Levels 6-10 (Monsters) or +3 to +5 (Items)
   - Tier 3: Levels 11-15 (Monsters) or +5 to +8 (Items)
5. Include at least 30 cards per deck
6. Balance curses/events at ~15-20% of doors deck

### Code Contributions

#### Setup

```bash
git clone <repo>
cd terminal-dungeon
npm install
npm run build
```

#### Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run linting: `npm run lint`
4. Run tests: `npm test`
5. Test manually with server + client
6. Commit with clear messages
7. Push and create a Pull Request

#### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add comments for complex logic
- Use meaningful variable names
- Keep functions focused and small

#### Testing

- Test all game phases
- Test edge cases (empty decks, disconnections, etc.)
- Test with 2-6 players
- Verify LAN discovery works
- Check reconnection behavior

### Documentation

Improvements to documentation are always welcome:

- Fix typos or unclear explanations
- Add examples
- Improve command descriptions
- Add troubleshooting tips

### Pull Request Process

1. Update README.md if needed
2. Update relevant documentation in `docs/`
3. Ensure all tests pass
4. Add description of changes
5. Reference any related issues
6. Wait for review

### Code Review

All submissions require review. We'll:
- Check code quality and style
- Verify functionality
- Test for regressions
- Suggest improvements

### Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn
- Have fun!

## Development Resources

- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Node.js Net API](https://nodejs.org/api/net.html)
- [Node.js Dgram API](https://nodejs.org/api/dgram.html)
- [Zod Schema Validation](https://zod.dev/)

## Questions?

Open an issue with the "question" label or join discussions.

Thank you for contributing! 🎉

