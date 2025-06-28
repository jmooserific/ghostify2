# Ghost JSON Import Format

## ✨ Overview

This document describes the structure required to create a valid JSON file for importing content into a Ghost blog. It includes metadata, content data, and relationships between posts, tags, and users.

---

## 📆 Core Structure

The JSON must include:

- `meta`: Metadata about the export
- `data`: The actual payload of posts, tags, users, etc.

Optional top-level wrapper:

```json
{
  "db": [
    {
      "meta": { ... },
      "data": { ... }
    }
  ]
}
```

---

## 🔖 meta

```json
{
  "exported_on": 168xyz...,  // UNIX timestamp in milliseconds
  "version": "5.0.0"         // Ghost version compatibility
}
```

---

## 📦 data

Arrays of structured data and relationships:

```json
"data": {
  "posts": [ /* post objects */ ],
  "tags": [ /* tag objects */ ],
  "users": [ /* user objects */ ],
  "posts_tags": [ /* link posts to tags */ ],
  "posts_authors": [ /* optional */ ],
  "roles_users": [ /* optional */ ]
}
```

IDs are local to the file and do not need to match Ghost DB IDs.

---

## 📝 Example: Post Object

```json
{
  "id": 1,
  "title": "Hello world",
  "slug": "hello-world",
  "mobiledoc": "...",  // JSON string
  "feature_image": null,
  "featured": 0,
  "page": 0,
  "status": "published",
  "published_at": 1610000000000,
  "created_at": 1600000000000,
  "updated_at": 1610001000000,
  "created_by": 1,
  "updated_by": 1,
  "author_id": 1
}
```

Required fields include: `title`, `mobiledoc`, `status`, `published_at`

---

## 🏷️ tags, users & relationships

- **tags**: `id`, `name`, `slug`, `description`
- **users**: `id`, `name`, `slug`, `email`, etc.
- **posts\_tags**: `{ "post_id": 1, "tag_id": 5 }`
- **posts\_authors**: Optional multiple author links
- **roles\_users**: Optional role relationships

Tags and authors must be linked via relationship arrays to show up in Ghost.

---

## 🔄 Content Format: mobiledoc

- Ghost requires content in **Mobiledoc** format
- Markdown or raw HTML will not be accepted directly
- You can convert using `@tryghost/migrate`

---

## ✅ Checklist

1. Valid JSON (no comments/trailing commas)
2. Contains both `meta` and `data`
3. Each post has `mobiledoc`, `title`, `status`, `published_at`
4. Include `posts_tags`, `posts_authors` if needed
5. All IDs match across arrays
6. (Optional) Wrap entire content in a `"db": [...]` block

---

## 📃 Summary

- `meta`: Export timestamp and version
- `data`: Posts, tags, users, and linking arrays
- `mobiledoc`: Required format for content
- Relationships: Required for tags/authors

With this structure, Ghost will be able to import the content smoothly.

