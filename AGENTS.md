# Repository Guidelines

## Project Structure & Module Organization
This repository is currently specification-first. Current tracked files are:
- PRD.md – product requirements and scope.
- openspec/config.yaml – artifact schema and spec context.
- openspec/changes/pick-day-mvp-spec/ – change planning, design, tasks, and feature specs (specs/, proposal.md, design.md, tasks.md).

When implementation begins, keep docs in sync with code and place application code under a standard Next.js App Router layout (app/, app/api/, lib/, components/, types/, supabase/).

## Build, Test, and Development Commands
- npx create-next-app@latest (initial project bootstrap, App Router + TypeScript + Tailwind).
- npm install / pnpm install – install dependencies.
- npm run dev – start local dev server for the running app.
- npm run build – type-check and produce production build.
- npm run lint – run linting before PR.
- npm run test – run automated tests once a test runner is added.
- npm run db:migrate or supabase db push (if/when migrations are introduced) to apply schema.

## Coding Style & Naming Conventions
- Primary stack: TypeScript + Next.js App Router + Tailwind CSS + Supabase.
- Use 2-space indentation and semicolons consistently.
- Use camelCase for variables/functions, PascalCase for React components and types, kebab-case for route and API file names.
- Keep API handlers in app/api/**/route.ts; shared helpers in lib/.
- Use explicit Zod schemas for request validation and keep domain logic out of UI components.

## Testing Guidelines
- No dedicated test framework is set up yet in this repo.
- Prefer unit tests for validation helpers and route handlers, and integration tests for API flows.
- Name tests as *.test.ts or *.test.tsx; place in __tests__/ or adjacent to source.
- Run tests before merge and keep tests close to changed behavior.
- Aim for high coverage of core flows: schedule creation, protected access, response submission/update, and admin assignment.

## Commit & Pull Request Guidelines
- No commit convention is documented in repo history/files, so use Conventional Commits (feat:, fix:, chore:, docs:).
- Keep commits focused and include scope tags for files changed (for example, feat(api): add response validation).
- PR description should include: why this change, test results, related issue/task ID, and screenshots for UI changes.
- Update openspec/.../tasks.md and relevant spec files when implementation diverges from requirements.

## Security & Configuration Tips
- Store secrets in environment files only: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and password-related keys.
- Never hard-code tokens/password hashes in code.
- Validate all user input (including token routes and form submissions) with schema-based checks before DB access.
