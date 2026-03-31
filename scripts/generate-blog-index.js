#!/usr/bin/env node
/**
 * generate-blog-index.js
 * 
 * Reads all JSON files from /data/blog/posts/ and generates
 * the /data/blog/index.js file with metadata for the listing page.
 * 
 * Run: node scripts/generate-blog-index.js
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '../frontend/src/data/blog/posts');
const INDEX_FILE = path.join(__dirname, '../frontend/src/data/blog/index.js');

// Default categories
const DEFAULT_CATEGORIES = [
  'Business Planning',
  'Commission Tracking',
  'Tools & Calculators',
  'Agent Productivity',
  'Profit & Loss',
  'AI Coaching',
  'Industry Insights'
];

function generateIndex() {
  console.log('🔄 Generating blog index...');
  
  // Get all JSON files except TEMPLATE.json
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'TEMPLATE.json');
  
  console.log(`📁 Found ${files.length} post files`);
  
  const posts = [];
  const allTags = new Set();
  const allCategories = new Set(DEFAULT_CATEGORIES);
  
  for (const file of files) {
    try {
      const filePath = path.join(POSTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const post = JSON.parse(content);
      
      // Only include published posts
      if (post.status !== 'published') {
        console.log(`  ⏭️  Skipping ${file} (status: ${post.status})`);
        continue;
      }
      
      // Extract metadata for index (exclude sections to keep index small)
      const metadata = {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        tags: post.tags || [],
        publishedAt: post.publishedAt,
        estimatedReadTime: post.estimatedReadTime,
        featuredImage: post.featuredImage,
        author: post.author,
        status: post.status
      };
      
      posts.push(metadata);
      
      // Collect tags
      if (post.tags) {
        post.tags.forEach(tag => allTags.add(tag));
      }
      
      // Collect categories
      if (post.category) {
        allCategories.add(post.category);
      }
      
      console.log(`  ✅ Processed ${file}`);
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error.message);
    }
  }
  
  // Sort posts by publishedAt date (newest first)
  posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // Generate index file content
  const indexContent = `// Auto-generated blog index - DO NOT EDIT MANUALLY
// Generated: ${new Date().toISOString()}
// Run: node scripts/generate-blog-index.js

export const blogPosts = ${JSON.stringify(posts, null, 2)};

export const categories = ${JSON.stringify([...allCategories].sort(), null, 2)};

export const tags = ${JSON.stringify([...allTags].sort(), null, 2)};
`;
  
  fs.writeFileSync(INDEX_FILE, indexContent);
  
  console.log('');
  console.log('✅ Blog index generated successfully!');
  console.log(`   📝 ${posts.length} published posts`);
  console.log(`   🏷️  ${allCategories.size} categories`);
  console.log(`   🔖 ${allTags.size} unique tags`);
  console.log(`   📄 Output: ${INDEX_FILE}`);
}

generateIndex();
