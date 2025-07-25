# Ghostify2

A TypeScript CLI tool to migrate your Tumblr blog posts to Ghost format. This tool fetches all posts from your Tumblr blog via the Tumblr API and exports them as a JSON file that can be imported into Ghost.

## Features

- ✅ Fetches all posts from your Tumblr blog
- ✅ Supports all Tumblr post types (text, photo, quote, link, chat, audio, video, answer)
- ✅ Converts Tumblr formatting to Ghost-compatible HTML
- ✅ Preserves tags, timestamps, and metadata
- ✅ Customizable author information for imported posts
- ✅ Exports in Ghost JSON 5.0 format (importable backup format)
- ✅ Rate limiting and pagination support
- ✅ Beautiful CLI interface with progress indicators
- ✅ Comprehensive error handling and validation
- ✅ Smart default filenames based on blog name
- ✅ Environment-based configuration

## Installation

1. Clone this repository:
```bash
git clone https://github.com/jmooserific/ghostify2.git
cd ghostify2
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Setup

1. Get your Tumblr API key:
   - Go to https://www.tumblr.com/oauth/apps
   - Create a new application
   - Copy your API key

2. Create your `.env` file:
```bash
cp env.example .env
```

3. Edit `.env` and add your credentials:
```env
# Tumblr API Credentials
TUMBLR_API_KEY=your_actual_api_key_here
TUMBLR_BLOG_NAME=your_blog_name.tumblr.com

# Ghost Import Settings
# Author information for imported posts
GHOST_AUTHOR_NAME=Your Name
GHOST_AUTHOR_EMAIL=your.email@example.com
GHOST_AUTHOR_SLUG=your-name
```

## Usage

### Basic Migration

Migrate all posts from your Tumblr blog:

```bash
# Using blog name from .env file
./bin/ghostify.js migrate

# Or specify blog name directly
./bin/ghostify.js migrate yourblog.tumblr.com
```

### Advanced Options

```bash
# Specify custom output file
./bin/ghostify.js migrate --output ./my-custom-export.json

# Limit number of posts
./bin/ghostify.js migrate --limit 100

# Include private posts (requires OAuth tokens)
./bin/ghostify.js migrate --include-private

# Disable automatic directory creation
./bin/ghostify.js migrate --no-create-dirs

# Combine options
./bin/ghostify.js migrate myblog.tumblr.com --limit 50 --output ./small-export.json
```

### Command Options

- `--output, -o`: Output file path (defaults to `./{blog-name}.json`)
- `--limit, -l`: Maximum number of posts to migrate (default: 1000)
- `--include-private`: Include private posts (requires OAuth tokens)
- `--create-dirs`: Create output directories if they don't exist (default: true)

### Default Filename Behavior

The tool automatically generates descriptive filenames based on your blog name:

- Blog: `myblog.tumblr.com` → File: `./myblog.json`
- Blog: `awesome-photos.tumblr.com` → File: `./awesome-photos.json`
- Blog: `johns_blog.tumblr.com` → File: `./johns-blog.json`

This avoids Ghost's restrictions on importing files named "ghost-export.json" and makes it clear which blog the export came from.

## Configuration

### Environment Variables

The tool uses environment variables for configuration. You can set these in your `.env` file:

**Required:**
- `TUMBLR_API_KEY`: Your Tumblr API key

**Optional:**
- `TUMBLR_BLOG_NAME`: Your blog name (e.g., `myblog.tumblr.com`)
- `GHOST_AUTHOR_NAME`: Author name for imported posts
- `GHOST_AUTHOR_EMAIL`: Author email for imported posts  
- `GHOST_AUTHOR_SLUG`: Author slug for imported posts

### Author Configuration

Since Tumblr doesn't include author information for posts, you can specify your own author details that will be used for all imported posts. Configure this in your `.env` file:

```env
# Author information for imported posts
GHOST_AUTHOR_NAME=John Doe
GHOST_AUTHOR_EMAIL=john.doe@example.com
GHOST_AUTHOR_SLUG=john-doe
```

**Requirements:**
- `GHOST_AUTHOR_NAME`: Your full name (required)
- `GHOST_AUTHOR_EMAIL`: A valid email address (required)
- `GHOST_AUTHOR_SLUG`: URL-friendly version of your name (required, lowercase letters, numbers, and hyphens only)

If not specified, the tool will use these defaults:
- Name: "Imported User"
- Email: "imported@example.com"
- Slug: "imported-user"

## Importing to Ghost

1. Run the migration tool to create your JSON export
2. In your Ghost admin panel, go to **Settings** → **Labs**
3. Click **Import content**
4. Select your exported JSON file
5. Ghost will import all your posts, tags, and authors

## Supported Post Types

- **Text posts**: Converted to HTML with proper formatting
- **Photo posts**: Images with captions converted to Ghost image cards
- **Quote posts**: Converted to Ghost blockquote format
- **Link posts**: Converted to Ghost bookmark cards
- **Chat posts**: Converted to custom chat format
- **Audio posts**: Audio players with optional captions
- **Video posts**: Video players with optional captions
- **Answer posts**: Q&A format with question and answer

## Development

### Project Structure

```
src/
├── commands/          # CLI commands
│   └── migrate.ts     # Main migration command
├── api/              # API integrations
│   └── tumblr.ts     # Tumblr API client
├── transform/        # Data transformation
│   └── formatPost.ts # Tumblr → Ghost conversion
├── export/           # Export functionality
│   └── jsonWriter.ts # Ghost JSON export
├── utils/            # Shared utilities
│   └── config.ts     # Configuration management
└── index.ts          # Main orchestration
bin/
└── ghostify.js       # CLI entry point
```

### Available Scripts

- `npm run build`: Build the TypeScript project
- `npm run dev`: Run in development mode
- `npm run test`: Run tests
- `npm run lint`: Lint the code
- `npm run format`: Format the code

### Adding New Post Types

To support new Tumblr post types, edit `src/transform/formatPost.ts` and add a new conversion method in the `convertToHTML` function.

## Troubleshooting

### Common Issues

1. **"TUMBLR_API_KEY environment variable is required"**
   - Make sure you've created a `.env` file with your API key
   - Verify the API key is correct and not the placeholder value

2. **"No blog name specified"**
   - Either provide the blog name as an argument: `./bin/ghostify.js migrate myblog.tumblr.com`
   - Or set `TUMBLR_BLOG_NAME` in your `.env` file

3. **"Tumblr API error: 403 Forbidden"**
   - Check that your API key is valid
   - Ensure the blog name is correct (include `.tumblr.com`)

4. **"Failed to fetch posts"**
   - The blog might be private or deleted
   - Check your internet connection
   - Verify the blog name format

5. **"Invalid author email format"**
   - Make sure your `GHOST_AUTHOR_EMAIL` is a valid email address
   - Check for typos in the email format

6. **"Invalid author slug format"**
   - Use only lowercase letters, numbers, and hyphens in `GHOST_AUTHOR_SLUG`
   - Example: `john-doe`, `my-name-123`

7. **Import fails in Ghost**
   - Ensure the JSON file is valid
   - Check that all required fields are present
   - Try importing a smaller subset first

### Rate Limiting

The tool includes built-in rate limiting (1 second between requests) to be respectful to Tumblr's API. If you encounter rate limit errors, the tool will automatically retry.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub. 