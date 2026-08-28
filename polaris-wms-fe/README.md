# Polaris WMS — Micro-Frontend Monorepo

A micro-frontend architecture using pnpm workspaces, Turborepo, Vite, React 19, and Module Federation.

## Tech Stack

- **Build**: pnpm workspaces + Turborepo
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite + `@originjs/vite-plugin-federation`
- **Styling**: TailwindCSS 4
- **Auth**: Keycloak (OpenID Connect)
- **State**: Zustand (client) + @tanstack/react-query (server)
- **Routing**: react-router-dom v7

## Structure

```
polaris-mfe/
├── apps/
│   ├── shell/              # Host application (port 5001)
│   └── remote-customer/    # Remote: Customer module (port 5002)
├── packages/
│   ├── service/            # Shared API service layer
│   └── polaris-ui/         # Shared UI components
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Build shared packages first
pnpm build-first

# Run all apps in dev mode
pnpm dev

# Run only the shell
pnpm dev:shell
```

## Environment Variables

Copy `.env.development` in each app and configure:

- `VITE_API_URL` — Backend API base URL
- `VITE_KEYCLOAK_URL` — Keycloak server URL
- `VITE_KEYCLOAK_REALM` — Keycloak realm name
- `VITE_KEYCLOAK_CLIENT_ID` — Keycloak client ID
- `VITE_URL_SERVICE_CUSTOMER` — Remote customer app URL
