import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  spaces: defineTable({
    spaceId: v.string(),
    name: v.string(),
    createdBy: v.optional(v.id("users")),
    expiresAt: v.number(),
    allowUploads: v.boolean(),
  })
    .index("by_spaceId", ["spaceId"])
    .index("by_createdBy", ["createdBy"])
    .index("by_expiresAt", ["expiresAt"]),

  files: defineTable({
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    mimeType: v.string(),
    expiresAt: v.number(),
    uploadedBy: v.optional(v.id("users")),
    // New space-based fields (optional for migration from old schema)
    spaceId: v.optional(v.id("spaces")),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    // Legacy fields (will be removed after migration)
    shareId: v.optional(v.string()),
    downloads: v.optional(v.number()),
    password: v.optional(v.string()),
    uploadRequestId: v.optional(v.id("files")), // was pointing to uploadRequests but table is gone
  })
    .index("by_spaceId", ["spaceId"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_shareId", ["shareId"]),
});
