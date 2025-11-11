---
description: Repository Information Overview
alwaysApply: true
---

# vite-react-typescript-starter Information

## Summary
A React application built with Vite and TypeScript, integrating Supabase for backend services. The project includes components for user profiles and texture browsing, with recent updates removing certain sort options.

## Structure
The repository contains a single React application with the following main directories:
- **src/**: Contains the main application code, including components (UserProfile.tsx, etc.), contexts, and library utilities.
- **supabase/**: Includes database migrations and temporary files for Supabase backend integration.

Configuration files at root: package.json, tsconfig.json, vite.config.ts, tailwind.config.js, eslint.config.js, postcss.config.js.

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: Node.js (version not specified in package.json)
**Build System**: Vite
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- @supabase/supabase-js: ^2.57.4
- @types/react-dropzone: ^4.2.2
- lucide-react: ^0.344.0
- react: ^18.3.1
- react-dom: ^18.3.1
- react-dropzone: ^14.3.8
- react-turnstile: ^1.1.4

**Development Dependencies**:
- @eslint/js: ^9.9.1
- @types/react: ^18.3.5
- @types/react-dom: ^18.3.0
- @vitejs/plugin-react: ^4.3.1
- autoprefixer: ^10.4.18
- eslint: ^9.9.1
- eslint-plugin-react-hooks: ^5.1.0-rc.0
- eslint-plugin-react-refresh: ^0.4.11
- globals: ^15.9.0
- postcss: ^8.4.35
- tailwindcss: ^3.4.1
- typescript: ^5.5.3
- typescript-eslint: ^8.3.0
- vite: ^5.4.2

## Build & Installation
```bash
npm install
npm run build
```

Development server:
```bash
npm run dev
```

Linting:
```bash
npm run lint
```

Type checking:
```bash
npm run typecheck
```

Preview built app:
```bash
npm run preview
```