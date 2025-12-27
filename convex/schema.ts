import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  spaces: defineTable({
    spaceId: v.string(),
    name: v.string(),
    createdBy: v.optional(v.string()), // Better Auth user ID (string)
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
    uploadedBy: v.optional(v.string()), // Better Auth user ID (string)
    spaceId: v.optional(v.id("spaces")),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    // Legacy fields
    shareId: v.optional(v.string()),
    downloads: v.optional(v.number()),
    password: v.optional(v.string()),
    uploadRequestId: v.optional(v.id("files")),
  })
    .index("by_spaceId", ["spaceId"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_shareId", ["shareId"]),
});
