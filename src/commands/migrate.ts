import { Command, Flags, Args } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { TumblrAPI } from '../api/tumblr';
import { GhostExporter } from '../export/jsonWriter';
import { PostTransformer } from '../transform/formatPost';
import { loadConfig } from '../utils/config';

export default class Migrate extends Command {
  static description = 'Migrate Tumblr blog posts to Ghost format';

  static examples = [
    '$ ghostify migrate myblog.tumblr.com',
    '$ ghostify migrate myblog.tumblr.com --output ./ghost-export.json',
    '$ ghostify migrate myblog.tumblr.com --limit 100 --include-private',
  ];

  static flags = {
    output: Flags.string({
      char: 'o',
      description: 'Output file path for Ghost JSON',
      default: './ghost-export.json',
    }),
    limit: Flags.integer({
      char: 'l',
      description: 'Maximum number of posts to migrate',
      default: 1000,
    }),
    'include-private': Flags.boolean({
      description: 'Include private posts (requires OAuth tokens)',
      default: false,
    }),
    'create-dirs': Flags.boolean({
      description: 'Create output directories if they don\'t exist',
      default: true,
    }),
  };

  static args = {
    blog: Args.string({
      description: 'Tumblr blog name (e.g., myblog.tumblr.com)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Migrate);
    const blogName = args.blog;

    try {
      this.log(chalk.blue('🚀 Starting Tumblr to Ghost migration...'));
      this.log(chalk.gray(`📝 Blog: ${blogName}`));
      this.log(chalk.gray(`📁 Output: ${flags.output}`));
      this.log(chalk.gray(`📊 Limit: ${flags.limit} posts`));

      // Load configuration
      const config = await loadConfig();
      this.log(chalk.green('✅ Configuration loaded'));
      this.log(chalk.gray(`👤 Author: ${config.author.name} (${config.author.email})`));

      // Initialize components
      const api = new TumblrAPI(config.apiKey);
      const transformer = new PostTransformer(config.author);
      const exporter = new GhostExporter();

      // Fetch posts from Tumblr
      this.log(chalk.blue('📥 Fetching posts from Tumblr...'));
      const posts = await api.fetchAllPosts(blogName, {
        limit: flags.limit,
        includePrivate: flags['include-private'],
      });
      this.log(chalk.green(`✅ Fetched ${posts.length} posts`));

      // Transform posts to Ghost format
      this.log(chalk.blue('🔄 Transforming posts to Ghost format...'));
      const ghostPosts = posts.map(post => transformer.transform(post));
      this.log(chalk.green(`✅ Transformed ${ghostPosts.length} posts`));

      // Create output directory if needed
      if (flags['create-dirs']) {
        const outputDir = path.dirname(flags.output);
        await fs.ensureDir(outputDir);
      }

      // Export to Ghost JSON format
      this.log(chalk.blue('📤 Exporting to Ghost JSON...'));
      await exporter.exportToFile(ghostPosts, flags.output);
      this.log(chalk.green(`✅ Exported to ${flags.output}`));

      this.log(chalk.green('🎉 Migration completed successfully!'));
      this.log(chalk.gray(`📊 Summary: ${posts.length} posts migrated`));
      this.log(chalk.gray(`👤 Author: ${config.author.name}`));
      this.log(chalk.gray(`📁 File: ${path.resolve(flags.output)}`));

    } catch (error) {
      this.error(chalk.red(`❌ Migration failed: ${error}`));
      process.exit(1);
    }
  }
} 