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
    '$ ghostify migrate',
    '$ ghostify migrate myblog.tumblr.com',
    '$ ghostify migrate --output ./custom-export.json',
    '$ ghostify migrate myblog.tumblr.com --limit 100 --include-private',
  ];

  static flags = {
    output: Flags.string({
      char: 'o',
      description: 'Output file path for Ghost JSON (defaults to blog-name.json)',
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
      description: 'Tumblr blog name (e.g., myblog.tumblr.com) - optional if TUMBLR_BLOG_NAME is set in .env',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Migrate);

    try {
      // Load configuration first
      const config = await loadConfig();
      this.log(chalk.green('✅ Configuration loaded'));
      this.log(chalk.gray(`👤 Author: ${config.author.name} (${config.author.email})`));

      // Determine blog name: command line argument takes precedence over config
      const blogName = args.blog || config.blogName;
      
      if (!blogName) {
        this.error(chalk.red('❌ No blog name specified. Please either:'));
        this.error(chalk.red('   1. Provide the blog name as an argument: ghostify migrate myblog.tumblr.com'));
        this.error(chalk.red('   2. Set TUMBLR_BLOG_NAME in your .env file'));
        process.exit(1);
      }

      // Generate default output filename based on blog name
      const defaultOutput = `./${this.sanitizeBlogName(blogName)}.json`;
      const outputPath = flags.output || defaultOutput;

      this.log(chalk.blue('🚀 Starting Tumblr to Ghost migration...'));
      this.log(chalk.gray(`📝 Blog: ${blogName}`));
      this.log(chalk.gray(`📁 Output: ${outputPath}`));
      this.log(chalk.gray(`📊 Limit: ${flags.limit} posts`));

      // Initialize components
      const api = new TumblrAPI(config.apiKey);
      const transformer = new PostTransformer(config.author);
      const exporter = new GhostExporter(config.author);

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
        const outputDir = path.dirname(outputPath);
        await fs.ensureDir(outputDir);
      }

      // Export to Ghost JSON format
      this.log(chalk.blue('📤 Exporting to Ghost JSON...'));
      await exporter.exportToFile(ghostPosts, outputPath);
      this.log(chalk.green(`✅ Exported to ${outputPath}`));

      this.log(chalk.green('🎉 Migration completed successfully!'));
      this.log(chalk.gray(`📊 Summary: ${posts.length} posts migrated`));
      this.log(chalk.gray(`👤 Author: ${config.author.name}`));
      this.log(chalk.gray(`📁 File: ${path.resolve(outputPath)}`));

    } catch (error) {
      this.error(chalk.red(`❌ Migration failed: ${error}`));
      process.exit(1);
    }
  }

  private sanitizeBlogName(blogName: string): string {
    // Remove .tumblr.com suffix and sanitize for filename
    return blogName
      .replace(/\.tumblr\.com$/i, '') // Remove .tumblr.com
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace invalid chars with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .toLowerCase();
  }
} 