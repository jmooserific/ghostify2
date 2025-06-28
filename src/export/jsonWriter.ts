import fs from 'fs-extra';
import path from 'path';
import { 
  GhostPost, 
  GhostTag, 
  GhostUser, 
  GhostRole,
  PostTag,
  PostAuthor,
  RoleUser,
  AuthorConfig
} from '../transform/formatPost';

export interface GhostExport {
  meta: {
    exported_on: number;
    version: string;
  };
  data: {
    posts: GhostPost[];
    tags: GhostTag[];
    users: GhostUser[];
    posts_tags: PostTag[];
    posts_authors: PostAuthor[];
    roles: GhostRole[];
    roles_users: RoleUser[];
  };
}

export class GhostExporter {
  private version = '5.0.0';
  private authorConfig?: AuthorConfig;

  constructor(authorConfig?: AuthorConfig) {
    this.authorConfig = authorConfig;
  }

  async exportToFile(posts: GhostPost[], outputPath: string): Promise<void> {
    try {
      // Extract unique tags and authors from posts
      const tags = this.extractUniqueTags(posts);
      const authors = this.extractUniqueAuthors(posts);

      // Create relationship arrays
      const postsTags = this.createPostsTags(posts, tags);
      const postsAuthors = this.createPostsAuthors(posts);
      const roles = this.createDefaultRoles();
      const rolesUsers = this.createRolesUsers(authors);

      // Create Ghost export structure (no db wrapper)
      const exportData: GhostExport = {
        meta: {
          exported_on: Date.now(),
          version: this.version,
        },
        data: {
          posts,
          tags,
          users: authors,
          posts_tags: postsTags,
          posts_authors: postsAuthors,
          roles,
          roles_users: rolesUsers,
        },
      };

      // Validate the export data
      this.validateExport(exportData);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.ensureDir(outputDir);

      // Write the JSON file with pretty printing
      await fs.writeJson(outputPath, exportData, {
        spaces: 2,
        encoding: 'utf8',
      });

    } catch (error) {
      throw new Error(`Failed to export to file: ${error}`);
    }
  }

  async exportToString(posts: GhostPost[]): Promise<string> {
    try {
      const tags = this.extractUniqueTags(posts);
      const authors = this.extractUniqueAuthors(posts);
      const postsTags = this.createPostsTags(posts, tags);
      const postsAuthors = this.createPostsAuthors(posts);
      const roles = this.createDefaultRoles();
      const rolesUsers = this.createRolesUsers(authors);

      const exportData: GhostExport = {
        meta: {
          exported_on: Date.now(),
          version: this.version,
        },
        data: {
          posts,
          tags,
          users: authors,
          posts_tags: postsTags,
          posts_authors: postsAuthors,
          roles,
          roles_users: rolesUsers,
        },
      };

      this.validateExport(exportData);

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Failed to export to string: ${error}`);
    }
  }

  private extractUniqueTags(posts: GhostPost[]): GhostTag[] {
    const tagMap = new Map<string, GhostTag>();
    let tagId = 1;

    for (const post of posts) {
      // Since we don't have tags in the post object anymore, we'll create a default tag
      if (tagMap.size === 0) {
        tagMap.set('imported', {
          id: tagId++,
          name: 'Imported',
          slug: 'imported',
          description: 'Posts imported from Tumblr',
        });
      }
    }

    return Array.from(tagMap.values());
  }

  private extractUniqueAuthors(posts: GhostPost[]): GhostUser[] {
    const authorMap = new Map<number, GhostUser>();

    for (const post of posts) {
      if (!authorMap.has(post.author_id)) {
        // Use the author config if available, otherwise fall back to defaults
        const name = this.authorConfig?.name || 'Imported User';
        const email = this.authorConfig?.email || 'imported@example.com';
        const slug = this.authorConfig?.slug || 'imported-user';
        
        authorMap.set(post.author_id, {
          id: post.author_id,
          name,
          slug,
          email,
          status: 'active',
          created_at: post.created_at,
          updated_at: post.updated_at,
        });
      }
    }

    return Array.from(authorMap.values());
  }

  private createPostsTags(posts: GhostPost[], tags: GhostTag[]): PostTag[] {
    const postsTags: PostTag[] = [];
    
    if (tags.length === 0) return postsTags;

    // Link all posts to the first tag
    for (const post of posts) {
      postsTags.push({
        post_id: post.id,
        tag_id: tags[0].id,
      });
    }
    
    return postsTags;
  }

  private createPostsAuthors(posts: GhostPost[]): PostAuthor[] {
    return posts.map(post => ({
      post_id: post.id,
      author_id: post.author_id,
    }));
  }

  private createDefaultRoles(): GhostRole[] {
    const now = Date.now();
    return [
      {
        id: 1,
        name: 'Author',
        description: 'Authors',
        created_at: now,
        updated_at: now,
      },
    ];
  }

  private createRolesUsers(authors: GhostUser[]): RoleUser[] {
    return authors.map(author => ({
      role_id: 1, // Author role
      user_id: author.id,
    }));
  }

  private validateExport(exportData: GhostExport): void {
    // Validate required fields
    if (!exportData.meta) {
      throw new Error('Export must contain meta');
    }
    if (!exportData.data) {
      throw new Error('Export must contain data');
    }
    const data = exportData.data;
    if (!data.posts) {
      throw new Error('Export must contain posts');
    }
    if (!data.tags) {
      throw new Error('Export must contain tags');
    }
    if (!data.users) {
      throw new Error('Export must contain users');
    }
    if (!data.posts_tags) {
      throw new Error('Export must contain posts_tags');
    }
    if (!data.posts_authors) {
      throw new Error('Export must contain posts_authors');
    }
    if (!data.roles) {
      throw new Error('Export must contain roles');
    }
    if (!data.roles_users) {
      throw new Error('Export must contain roles_users');
    }
    // Validate each post has required Ghost fields
    for (const post of data.posts) {
      this.validatePost(post);
    }
    // Validate each tag has required fields
    for (const tag of data.tags) {
      this.validateTag(tag);
    }
    // Validate each author has required fields
    for (const author of data.users) {
      this.validateAuthor(author);
    }
  }

  private validatePost(post: GhostPost): void {
    const requiredFields = ['id', 'title', 'mobiledoc', 'status', 'published_at'];
    
    for (const field of requiredFields) {
      if (!post[field as keyof GhostPost]) {
        throw new Error(`Post missing required field: ${field}`);
      }
    }
    // Validate mobiledoc content
    if (!post.mobiledoc || post.mobiledoc.trim() === '') {
      throw new Error(`Post ${post.id} has empty mobiledoc content`);
    }
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(post.slug)) {
      throw new Error(`Post ${post.id} has invalid slug: ${post.slug}`);
    }
  }

  private validateTag(tag: GhostTag): void {
    const requiredFields = ['id', 'name', 'slug'];
    
    for (const field of requiredFields) {
      if (!tag[field as keyof GhostTag]) {
        throw new Error(`Tag missing required field: ${field}`);
      }
    }
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(tag.slug)) {
      throw new Error(`Tag ${tag.id} has invalid slug: ${tag.slug}`);
    }
  }

  private validateAuthor(author: GhostUser): void {
    const requiredFields = ['id', 'name', 'slug', 'email', 'status'];
    
    for (const field of requiredFields) {
      if (!author[field as keyof GhostUser]) {
        throw new Error(`Author missing required field: ${field}`);
      }
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(author.email)) {
      throw new Error(`Author ${author.id} has invalid email: ${author.email}`);
    }
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(author.slug)) {
      throw new Error(`Author ${author.id} has invalid slug: ${author.slug}`);
    }
  }

  async createBackup(outputPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = outputPath.replace('.json', `-backup-${timestamp}.json`);
    
    if (await fs.pathExists(outputPath)) {
      await fs.copy(outputPath, backupPath);
    }
    
    return backupPath;
  }

  async validateFile(filePath: string): Promise<boolean> {
    try {
      const data = await fs.readJson(filePath);
      this.validateExport(data);
      return true;
    } catch (error) {
      console.error(`Validation failed: ${error}`);
      return false;
    }
  }
} 