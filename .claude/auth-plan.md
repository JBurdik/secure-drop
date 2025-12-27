# Authentication Plan for SecureDrop

## Goal
Integrate Better Auth with Convex to enable:
1. User authentication (sign up, sign in, sign out)
2. Shared sessions across multiple projects (SSO-like experience)
3. Extended space limits for authenticated users

## Options Considered

### Option 1: Better Auth with Convex Component
**Recommended approach**

Better Auth is a modern auth library that can be integrated with Convex using the `@convex-dev/better-auth` component.

**Pros:**
- Modern, well-maintained library
- Supports multiple providers (email/password, OAuth, magic links)
- Can share sessions via shared database or JWT tokens
- Good TypeScript support

**Cons:**
- Requires additional setup
- Need to manage session sharing manually

### Option 2: Central Auth Service (auth.burdych.net)
**Best for cross-project SSO**

Deploy a dedicated authentication service that all your projects use.

**Architecture:**
```
auth.burdych.net (Central Auth Service)
    |
    +-- secure-drop.burdych.net
    +-- other-project.burdych.net
    +-- another-project.burdych.net
```

**Pros:**
- True SSO - login once, access all projects
- Centralized user management
- Single source of truth for users

**Cons:**
- More complex infrastructure
- Single point of failure
- Need to deploy and maintain separate service

### Option 3: Clerk/Auth0 (Third-party)
Use a managed auth service.

**Pros:**
- Easy setup
- Handles all auth complexity
- Built-in SSO capabilities

**Cons:**
- Cost at scale
- Vendor lock-in
- Data stored externally

---

## Recommended Implementation: Central Auth Service

For sharing sessions across projects, the best approach is a **central auth service** at `auth.burdych.net`.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    auth.burdych.net                         │
│                   (Better Auth Server)                      │
│                                                             │
│  - User registration/login                                  │
│  - OAuth providers (GitHub, Google, etc.)                   │
│  - Session management                                       │
│  - JWT token issuance                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ JWT tokens
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  SecureDrop   │    │  Project B    │    │  Project C    │
│  (Convex)     │    │  (Convex)     │    │  (Any backend)│
│               │    │               │    │               │
│ Validates JWT │    │ Validates JWT │    │ Validates JWT │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Implementation Steps

#### Phase 1: Central Auth Service Setup

1. **Create new project for auth.burdych.net**
   ```bash
   mkdir auth-service
   cd auth-service
   npm create vite@latest . -- --template react-ts
   npm install better-auth @better-auth/client
   ```

2. **Configure Better Auth server**
   - Email/password authentication
   - OAuth providers (optional): GitHub, Google
   - PostgreSQL or SQLite for user storage
   - JWT token configuration with shared secret

3. **Deploy to Dokploy**
   - Domain: auth.burdych.net
   - Persistent database volume

#### Phase 2: SecureDrop Integration

1. **Add Better Auth client to SecureDrop**
   ```bash
   npm install @better-auth/client
   ```

2. **Configure Convex to validate JWTs**
   - Update `convex/auth.config.ts` with JWT issuer
   - Add JWKS endpoint from auth service

3. **Update UI components**
   - Replace localStorage-based ownership with auth
   - Add sign in/out buttons
   - Show user info in header

#### Phase 3: Shared Session

1. **Cookie configuration**
   - Set cookies on `.burdych.net` domain
   - All subdomains can read the session

2. **Token refresh**
   - Implement token refresh flow
   - Handle expired tokens gracefully

---

## Simplified Alternative: Single-Project Better Auth

If cross-project SSO is not critical, a simpler approach:

1. **Install Better Auth directly in SecureDrop**
   ```bash
   npm install better-auth @convex-dev/better-auth
   ```

2. **Configure in Convex**
   ```typescript
   // convex/auth.ts
   import { betterAuth } from "@convex-dev/better-auth";
   
   export const { auth, signIn, signOut } = betterAuth({
     providers: [
       // Email/password
       { type: "credentials" },
       // OAuth (optional)
       { type: "github", clientId: "...", clientSecret: "..." },
     ],
   });
   ```

3. **Update frontend**
   - Add `BetterAuthProvider`
   - Use `useSession()` hook for auth state

---

## Decision Required

**Question for you:**

1. **Do you need SSO across multiple projects?**
   - Yes → Go with Central Auth Service (auth.burdych.net)
   - No → Go with Single-Project Better Auth

2. **Which OAuth providers do you want?**
   - GitHub
   - Google
   - Discord
   - Email/password only

3. **Database preference for auth service?**
   - PostgreSQL (recommended for production)
   - SQLite (simpler, good for small scale)

---

## Files to Create/Modify

### For Central Auth Service:
- `auth-service/` (new project)
  - `src/auth.ts` - Better Auth configuration
  - `src/routes/` - Auth API routes
  - `docker-compose.yml` - Deployment config

### For SecureDrop:
- `convex/auth.config.ts` - JWT validation config
- `src/lib/auth.ts` - Auth client setup
- `src/components/AuthButton.tsx` - Sign in/out UI
- `src/main.tsx` - Add auth provider
- `src/App.tsx` - Update with auth state

---

## Timeline Estimate

- **Central Auth Service**: 2-3 days
  - Day 1: Setup Better Auth server, deploy
  - Day 2: Integrate with SecureDrop
  - Day 3: Testing, polish

- **Single-Project Auth**: 1 day
  - Setup and integrate Better Auth with Convex
