# Contributing to DSA Layered Study System

Thanks for taking the time to contribute. This is primarily a personal study project, but bug reports, corrections, and small improvements are welcome.

## Ground rules

- Be respectful — see the [Code of Conduct](CODE_OF_CONDUCT.md).
- Open an issue before starting large or structural changes, so we can agree on the approach first.
- Keep pull requests focused: one fix or feature per PR.

## Getting set up

```bash
git clone https://github.com/INEEDTHATGT3/dsa-lms.git
cd dsa-lms
npm install
npm run dev
```

Requires Node.js 20+.

## Making a change

1. Fork the repo and create a branch off `main`:
   ```bash
   git checkout -b fix/short-description
   ```
2. Make your change. Keep commits small and focused.
3. Before opening a PR, run the same checks CI runs:
   ```bash
   npm run lint
   node scripts/validate-content.mjs
   npm run build
   ```
4. Push your branch and open a pull request against `main`, describing what changed and why. Reference any related issue.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include steps to reproduce, what you expected, and what actually happened — screenshots help a lot for UI issues.

## Content corrections

If you spot an error in a lesson (wrong complexity, broken code sample, typo), please open an issue describing the module, tier, and lesson affected. Lesson content is authored outside this repo and synced in, so content fixes may take a little longer to land than code fixes.

## Code style

- Follow the existing ESLint configuration (`npm run lint`) — CI will reject unlinted code.
- Match the conventions already used in the file you're editing (hooks patterns, naming, component structure) rather than introducing a new style.
