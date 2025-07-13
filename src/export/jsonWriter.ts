import fs from 'fs-extra';
import path from 'path';
import { 
  GhostPost, 
  AuthorConfig
} from '../transform/formatPost';

export interface GhostExport {
  db: Array<{
    meta: {
      exported_on: number;
      version: string;
    };
    data: {
      posts: GhostPost[];
    };
  }>;
}

export class GhostExporter {
  private version = '5.129.1';
  private authorConfig?: AuthorConfig;

  constructor(authorConfig?: AuthorConfig) {
    this.authorConfig = authorConfig;
  }

  async exportToFile(posts: GhostPost[], outputPath: string): Promise<void> {
    try {
      // Create simplified Ghost export structure
      const exportData: GhostExport = {
        db: [
          {
            meta: {
              exported_on: Date.now(),
              version: this.version,
            },
            data: {
              posts,
            },
          },
        ],
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
      const exportData: GhostExport = {
        db: [
          {
            meta: {
              exported_on: Date.now(),
              version: this.version,
            },
            data: {
              posts,
            },
          },
        ],
      };

      this.validateExport(exportData);

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Failed to export to string: ${error}`);
    }
  }

  private validateExport(exportData: GhostExport): void {
    // Validate required fields
    if (!exportData.db || !Array.isArray(exportData.db) || exportData.db.length === 0) {
      throw new Error('Export must contain a db array with at least one object');
    }
    const dbEntry = exportData.db[0];
    if (!dbEntry.meta) {
      throw new Error('db entry must contain meta');
    }
    if (!dbEntry.data) {
      throw new Error('db entry must contain data');
    }
    if (!dbEntry.data.posts) {
      throw new Error('data must contain posts array');
    }
    
    // Validate posts
    this.validatePosts(dbEntry.data.posts);
  }

  private validatePosts(posts: GhostPost[]): void {
    for (const post of posts) {
      this.validatePost(post);
    }
  }

  private validatePost(post: GhostPost): void {
    const requiredFields = ['id', 'uuid', 'title', 'slug', 'type', 'status', 'published_at'];
    for (const field of requiredFields) {
      if (!post[field as keyof GhostPost]) {
        throw new Error(`Post missing required field: ${field}`);
      }
    }
    
    if (!/^[a-z0-9-]+$/.test(post.slug)) {
      throw new Error(`Post ${post.id} has invalid slug: ${post.slug}`);
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