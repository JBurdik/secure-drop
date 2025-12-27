# SecureDrop - Private File Sharing

Portfolio showcase project demonstrating Convex real-time capabilities.

## Concept

Simple application for private file sharing with unique links, expiration, and the ability to receive files from others via upload requests.

## Tech Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Convex self-hosted (database, file storage, real-time)
- **Auth:** Convex Auth (optional - anonymous vs. registered)
- **Deployment:** 
  - Convex backend: Docker on VPS (Coolify/Dokploy)
  - Frontend: Vercel / Netlify / VPS

## Self-Hosting Setup

### Convex Backend
- Deploy via Docker Compose (backend + dashboard)
- Default storage: SQLite (can switch to Postgres/Neon)
- File storage: Local filesystem or S3-compatible
- Required env vars:
  - `CONVEX_CLOUD_ORIGIN` - backend URL
  - `CONVEX_SITE_ORIGIN` - backend URL + `/http` (for HTTP actions & auth callbacks)

### Auth on Self-Hosted
Convex Auth works on self-hosted but requires manual setup (CLI doesn't support it yet).

**Setup steps:**
1. Configure `convex/auth.config.ts` with providers
2. Set `CONVEX_SITE_ORIGIN` correctly for auth callbacks
3. Add `authTables` to schema

**Recommended providers for MVP:**
- Password (email + password) - simplest
- GitHub OAuth - easy setup
- Magic Links via Resend - passwordless

```typescript
// convex/auth.ts
import { Password } from "@convex-dev/auth/providers/Password";
import GitHub from "@auth/core/providers/github";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password, GitHub],
});
```

## MVP Features

### 1. File Upload & Sharing
- Drag & drop file upload
- Unique share link generation
- Default expiration 48h (configurable: 1h, 24h, 48h, 7 days)
- Password protection (optional)
- Download counter

### 2. Upload Requests
- Create "upload request" link
- Send link to someone → they upload files to you
- Real-time notification when someone uploads
- Optional description of expected files

### 3. QR Code Sharing
- QR code generation for every share link
- Quick copy/download QR as PNG
- Ideal for mobile file transfer

### 4. File Preview
- In-browser preview for common types (images, PDF, video, audio)
- Fallback to download for other types

## Database Schema (Convex)

```typescript
// files table
files: defineTable({
  storageId: v.id("_storage"),
  name: v.string(),
  size: v.number(),
  mimeType: v.string(),
  shareId: v.string(), // unique share identifier
  password: v.optional(v.string()), // hashed
  expiresAt: v.number(), // timestamp
  downloads: v.number(),
  maxDownloads: v.optional(v.number()),
  uploadedBy: v.optional(v.id("users")),
  uploadRequestId: v.optional(v.id("uploadRequests")),
})
  .index("by_shareId", ["shareId"])
  .index("by_expiresAt", ["expiresAt"])

// uploadRequests table
uploadRequests: defineTable({
  requestId: v.string(), // unique request identifier
  description: v.optional(v.string()),
  createdBy: v.optional(v.id("users")),
  expiresAt: v.number(),
  maxFiles: v.optional(v.number()),
  receivedFiles: v.number(),
})
  .index("by_requestId", ["requestId"])
  .index("by_expiresAt", ["expiresAt"])
```

## Pages / Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with upload dropzone |
| `/f/:shareId` | File download/preview page |
| `/r/:requestId` | Upload request page (for uploaders) |
| `/dashboard` | User's files & upload requests (auth required) |

## API Functions (Convex)

### Mutations
- `uploadFile` - Upload file and generate share link
- `deleteFile` - Delete file by ID
- `createUploadRequest` - Create new upload request
- `uploadToRequest` - Upload file to someone's request

### Queries
- `getFileByShareId` - Get file metadata for preview/download
- `getUploadRequest` - Get upload request details
- `getUserFiles` - List user's uploaded files
- `getUserRequests` - List user's upload requests

### Scheduled Jobs
- `cleanupExpiredFiles` - Cron job to delete expired files

## UI Components

- `DropZone` - Drag & drop upload area
- `FileCard` - File info with share link, QR, expiration
- `ExpirationSelect` - Dropdown for expiration options
- `QRCodeModal` - Display/download QR code
- `FilePreview` - Preview component for various file types
- `PasswordPrompt` - Password input for protected files
- `UploadRequestForm` - Create upload request form

## Implementation Phases

### Phase 1: Core Upload & Sharing
1. Setup Convex project with schema
2. Implement file upload mutation
3. Create download/preview page
4. Add expiration options

### Phase 2: Upload Requests
1. Upload request creation
2. Upload request page for uploaders
3. Real-time notifications

### Phase 3: Polish
1. QR code generation
2. Password protection
3. Dashboard for managing files
4. Cleanup cron job

## Future Enhancements (Post-MVP)
- End-to-end encryption
- Folder/collection sharing
- Burn after reading mode
- Custom branding for links
- Analytics (views, downloads over time)
