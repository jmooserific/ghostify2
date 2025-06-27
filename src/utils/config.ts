import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

export interface Config {
  apiKey: string;
  blogName?: string;
  accessToken?: string;
  accessTokenSecret?: string;
}

export async function loadConfig(): Promise<Config> {
  // Load environment variables from .env file
  const envPath = path.resolve(process.cwd(), '.env');
  
  if (await fs.pathExists(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    // Try to load from env.example if .env doesn't exist
    const examplePath = path.resolve(process.cwd(), 'env.example');
    if (await fs.pathExists(examplePath)) {
      console.warn('⚠️  No .env file found. Please copy env.example to .env and add your Tumblr API credentials.');
    }
  }

  const apiKey = process.env.TUMBLR_API_KEY;
  const blogName = process.env.TUMBLR_BLOG_NAME;
  const accessToken = process.env.TUMBLR_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TUMBLR_ACCESS_TOKEN_SECRET;

  if (!apiKey) {
    throw new Error(
      'TUMBLR_API_KEY environment variable is required. ' +
      'Please add it to your .env file or set it in your environment.'
    );
  }

  return {
    apiKey,
    blogName,
    accessToken,
    accessTokenSecret,
  };
}

export function validateConfig(config: Config): void {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error('Tumblr API key is required');
  }

  if (config.apiKey === 'your_tumblr_api_key_here') {
    throw new Error(
      'Please replace the placeholder API key with your actual Tumblr API key. ' +
      'You can get one from https://www.tumblr.com/oauth/apps'
    );
  }
}

export async function createEnvFile(): Promise<void> {
  const envPath = path.resolve(process.cwd(), '.env');
  const examplePath = path.resolve(process.cwd(), 'env.example');

  if (await fs.pathExists(envPath)) {
    console.log('✅ .env file already exists');
    return;
  }

  if (await fs.pathExists(examplePath)) {
    await fs.copy(examplePath, envPath);
    console.log('✅ Created .env file from env.example');
    console.log('📝 Please edit .env file and add your Tumblr API credentials');
  } else {
    // Create a basic .env file
    const envContent = `# Tumblr API Credentials
# Get these from https://www.tumblr.com/oauth/apps
TUMBLR_API_KEY=your_tumblr_api_key_here
TUMBLR_BLOG_NAME=your_blog_name.tumblr.com

# Optional: OAuth tokens for private blogs
# TUMBLR_ACCESS_TOKEN=your_access_token_here
# TUMBLR_ACCESS_TOKEN_SECRET=your_access_token_secret_here
`;

    await fs.writeFile(envPath, envContent, 'utf8');
    console.log('✅ Created .env file');
    console.log('📝 Please edit .env file and add your Tumblr API credentials');
  }
}

export function getApiKeyFromArgs(args: string[]): string | undefined {
  // Look for API key in command line arguments
  const apiKeyIndex = args.findIndex(arg => arg === '--api-key' || arg === '-k');
  if (apiKeyIndex !== -1 && apiKeyIndex + 1 < args.length) {
    return args[apiKeyIndex + 1];
  }
  return undefined;
}

export function getBlogNameFromArgs(args: string[]): string | undefined {
  // Look for blog name in command line arguments
  const blogIndex = args.findIndex(arg => arg === '--blog' || arg === '-b');
  if (blogIndex !== -1 && blogIndex + 1 < args.length) {
    return args[blogIndex + 1];
  }
  return undefined;
} 