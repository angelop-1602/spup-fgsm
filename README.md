## Faculty Grading Sheets Management (FGSM)

This project is a Laravel 12 application using Inertia React (TypeScript), Tailwind, and shadcn/ui.

### Project structure & conventions

- **Backend**
  - `app/Domain/<Module>`: Domain logic per module (services, DTOs, actions, helpers).
    - Example: `app/Domain/Terms`, `app/Domain/FacultyLoads`, `app/Domain/Submissions`.
  - `app/Http/Controllers`: HTTP controllers for Inertia pages and APIs.
  - `app/Http/Requests`: FormRequest classes for validation.
  - `app/Policies`: Authorization policies (Dean/Registrar/Admin scopes).

- **Frontend**
  - `resources/js/pages`: Inertia pages (route entry points).
  - `resources/js/components`: Shared layout and feature components.
  - `resources/js/components/ui`: shadcn/ui primitives (Button, Input, Dialog, etc.).

### Code quality tooling

- **PHP**
  - Laravel Pint is configured via `pint.json` with the `laravel` preset.
  - Run formatting: `vendor/bin/pint --dirty --format agent` or `composer lint`.

- **TypeScript / React**
  - ESLint flat config: `eslint.config.js` (React + TypeScript + import rules + Prettier).
  - Prettier with Tailwind plugin for JS/TS/TSX: `npm run format` / `npm run format:check`.
  - Lint JS/TS: `npm run lint`.

### Running the app locally

- Start Laravel dev server: `php artisan serve --host=127.0.0.1 --port=8000`
- Start Vite dev server: `npm run dev`

