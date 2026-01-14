import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  spaces: defineTable({
    spaceId: v.string(),
    name: v.string(),
    createdBy: v.optional(v.string()), // Better Auth user ID (string)
    expiresAt: v.number(),
    allowUploads: v.boolean(),
    requireAuthForUpload: v.optional(v.boolean()), // Only authenticated users can upload
  })
    .index("by_spaceId", ["spaceId"])
    .index("by_createdBy", ["createdBy"])
    .index("by_expiresAt", ["expiresAt"]),

  folders: defineTable({
    spaceId: v.id("spaces"),
    name: v.string(),
    positionX: v.number(),
    positionY: v.number(),
    createdBy: v.optional(v.string()),
    color: v.optional(v.string()), // Folder color (amber, blue, green, red, purple, pink, orange)
    icon: v.optional(v.string()), // Lucide icon name
  }).index("by_spaceId", ["spaceId"]),

  files: defineTable({
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    mimeType: v.string(),
    expiresAt: v.number(),
    uploadedBy: v.optional(v.string()), // Better Auth user ID (string)
    spaceId: v.optional(v.id("spaces")),
    folderId: v.optional(v.id("folders")), // File can be inside a folder
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    // Legacy fields
    shareId: v.optional(v.string()),
    downloads: v.optional(v.number()),
    password: v.optional(v.string()),
    uploadRequestId: v.optional(v.id("files")),
  })
    .index("by_spaceId", ["spaceId"])
    .index("by_folderId", ["folderId"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_shareId", ["shareId"]),
});
