import { Command } from '@oclif/command';
import chalk from 'chalk';
import { TumblrAPI } from './api/tumblr';
import { GhostExporter } from './export/jsonWriter';
import { PostTransformer } from './transform/formatPost';
import { loadConfig } from './utils/config';

export interface MigrationOptions {
  blogName: string;
  outputPath: string;
  includePrivate?: boolean;
  limit?: number;
}

export class Ghostify extends Command {
  static description = 'Migrate Tumblr blog posts to Ghost format';

  static examples = [
    '$ ghostify migrate myblog.tumblr.com',
    '$ ghostify migrate myblog.tumblr.com --output ./ghost-export.json',
    '$ ghostify migrate myblog.tumblr.com --limit 100 --include-private',
  ];

  async run(): Promise<void> {
    try {
      this.log(chalk.blue('🚀 Starting Tumblr to Ghost migration...'));
      
      const config = await loadConfig();
      const api = new TumblrAPI(config.apiKey);
      const transformer = new PostTransformer();
      const exporter = new GhostExporter();

      // This will be called by the migrate command
      this.log(chalk.green('✅ Ghostify initialized successfully'));
    } catch (error) {
      this.error(chalk.red(`❌ Failed to initialize: ${error}`));
    }
  }
}

export default Ghostify; 