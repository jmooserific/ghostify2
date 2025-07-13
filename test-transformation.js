const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript
const { PostTransformer } = require('./dist/src/transform/formatPost');
const { GhostExporter } = require('./dist/src/export/jsonWriter');

// Load the sample data
const sampleData = JSON.parse(fs.readFileSync('./docs/tumblr-posts-example.json', 'utf8'));

// Create a transformer instance
const transformer = new PostTransformer({
  name: 'Test Author',
  email: 'test@example.com',
  slug: 'test-author'
});

// Create an exporter instance
const exporter = new GhostExporter({
  name: 'Test Author',
  email: 'test@example.com',
  slug: 'test-author'
});

// Test with the first few posts
const testPosts = sampleData.response.posts.slice(0, 3);

console.log('Testing transformation with sample data...\n');

// Transform posts
const ghostPosts = [];
testPosts.forEach((post, index) => {
  console.log(`=== Post ${index + 1} ===`);
  console.log(`Type: ${post.type}`);
  console.log(`Title: ${transformer.extractTitle ? transformer.extractTitle(post) : 'N/A'}`);
  console.log(`Slug: ${transformer.generateSlug ? transformer.generateSlug(post) : 'N/A'}`);
  
  // Transform the post
  try {
    const ghostPost = transformer.transform(post);
    ghostPosts.push(ghostPost);
    
    console.log(`Ghost Post ID: ${ghostPost.id}`);
    console.log(`Ghost Post Title: ${ghostPost.title}`);
    console.log(`Ghost Post Slug: ${ghostPost.slug}`);
    console.log(`Has Feature Image: ${!!ghostPost.feature_image}`);
    
    // Check mobiledoc structure
    const mobiledoc = JSON.parse(ghostPost.mobiledoc);
    console.log(`Mobiledoc Version: ${mobiledoc.version}`);
    console.log(`Mobiledoc Sections: ${mobiledoc.sections.length}`);
    console.log(`Mobiledoc Cards: ${mobiledoc.cards.length}`);
    
    // Show first few characters of mobiledoc
    const mobiledocPreview = ghostPost.mobiledoc.substring(0, 200) + '...';
    console.log(`Mobiledoc Preview: ${mobiledocPreview}`);
    
  } catch (error) {
    console.error(`Error transforming post: ${error.message}`);
  }
  
  console.log('');
});

// Create Ghost export
console.log('Creating Ghost export...');
exporter.exportToFile(ghostPosts, './test-ghost-export.json')
  .then(() => {
    console.log('Ghost export created successfully: test-ghost-export.json');
    
    // Read and display the export structure
    const exportData = JSON.parse(fs.readFileSync('./test-ghost-export.json', 'utf8'));
    console.log('\nExport structure:');
    console.log('Meta:', Object.keys(exportData.meta));
    console.log('Data keys:', Object.keys(exportData.data));
    console.log('Posts count:', exportData.data.posts.length);
    console.log('Tags count:', exportData.data.tags.length);
    console.log('Users count:', exportData.data.users.length);
    console.log('Posts_tags count:', exportData.data.posts_tags.length);
    console.log('Posts_authors count:', exportData.data.posts_authors.length);
    console.log('Roles count:', exportData.data.roles.length);
    console.log('Roles_users count:', exportData.data.roles_users.length);
    
  })
  .catch(error => {
    console.error('Error creating export:', error.message);
  });

console.log('Transformation test completed!'); 