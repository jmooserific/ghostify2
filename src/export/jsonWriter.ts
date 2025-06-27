import fs from 'fs-extra';
import path from 'path';
import { GhostPost, GhostTag, GhostAuthor } from '../transform/formatPost';

export interface GhostExport {
  meta: {
    exported_on: number;
    version: string;
  };
  data: {
    posts: GhostPost[];
    tags: GhostTag[];
    users: GhostAuthor[];
  };
}

export class GhostExporter {
  private version = '5.0';

  async exportToFile(posts: GhostPost[], outputPath: string): Promise<void> {
    try {
      // Extract unique tags and authors from posts
      const tags = this.extractUniqueTags(posts);
      const authors = this.extractUniqueAuthors(posts);

      // Create Ghost export structure
      const exportData: GhostExport = {
        meta: {
          exported_on: Date.now(),
          version: this.version,
        },
        data: {
          posts,
          tags,
          users: authors,
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

      const exportData: GhostExport = {
        meta: {
          exported_on: Date.now(),
          version: this.version,
        },
        data: {
          posts,
          tags,
          users: authors,
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

    for (const post of posts) {
      for (const tag of post.tags) {
        if (!tagMap.has(tag.slug)) {
          tagMap.set(tag.slug, tag);
        }
      }
    }

    return Array.from(tagMap.values());
  }

  private extractUniqueAuthors(posts: GhostPost[]): GhostAuthor[] {
    const authorMap = new Map<string, GhostAuthor>();

    for (const post of posts) {
      for (const author of post.authors) {
        if (!authorMap.has(author.id)) {
          authorMap.set(author.id, author);
        }
      }
    }

    return Array.from(authorMap.values());
  }

  private validateExport(exportData: GhostExport): void {
    // Validate required fields
    if (!exportData.data.posts) {
      throw new Error('Export must contain posts');
    }

    if (!exportData.data.tags) {
      throw new Error('Export must contain tags');
    }

    if (!exportData.data.users) {
      throw new Error('Export must contain users');
    }

    // Validate each post has required Ghost fields
    for (const post of exportData.data.posts) {
      this.validatePost(post);
    }

    // Validate each tag has required fields
    for (const tag of exportData.data.tags) {
      this.validateTag(tag);
    }

    // Validate each author has required fields
    for (const author of exportData.data.users) {
      this.validateAuthor(author);
    }
  }

  private validatePost(post: GhostPost): void {
    const requiredFields = ['id', 'uuid', 'title', 'slug', 'html', 'created_at', 'updated_at', 'published_at'];
    
    for (const field of requiredFields) {
      if (!post[field as keyof GhostPost]) {
        throw new Error(`Post missing required field: ${field}`);
      }
    }

    // Validate HTML content
    if (!post.html || post.html.trim() === '') {
      throw new Error(`Post ${post.id} has empty HTML content`);
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(post.slug)) {
      throw new Error(`Post ${post.id} has invalid slug: ${post.slug}`);
    }
  }

  private validateTag(tag: GhostTag): void {
    const requiredFields = ['id', 'name', 'slug', 'visibility'];
    
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

  private validateAuthor(author: GhostAuthor): void {
    const requiredFields = ['id', 'name', 'slug', 'email', 'status', 'created_at', 'updated_at', 'roles'];
    
    for (const field of requiredFields) {
      if (!author[field as keyof GhostAuthor]) {
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