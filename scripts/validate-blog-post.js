#!/usr/bin/env node
/**
 * validate-blog-post.js
 * 
 * Validates a blog post JSON file for required fields and correct format.
 * 
 * Run: node scripts/validate-blog-post.js <path-to-post.json>
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = [
  'slug',
  'title',
  'metaTitle',
  'metaDescription',
  'publishedAt',
  'author',
  'category',
  'featuredImage',
  'excerpt',
  'estimatedReadTime',
  'sections',
  'status'
];

const VALID_SECTION_TYPES = [
  'paragraph',
  'heading',
  'list',
  'callout',
  'image',
  'cta-inline',
  'faq',
  'blockquote',
  'code',
  'table'
];

const VALID_CATEGORIES = [
  'Business Planning',
  'Commission Tracking',
  'Tools & Calculators',
  'Agent Productivity',
  'Profit & Loss',
  'AI Coaching',
  'Industry Insights'
];

const VALID_STATUSES = ['draft', 'published'];

function validatePost(filePath) {
  console.log(`\n🔍 Validating: ${filePath}\n`);
  
  const errors = [];
  const warnings = [];
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    process.exit(1);
  }
  
  // Parse JSON
  let post;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    post = JSON.parse(content);
  } catch (error) {
    console.error('❌ Invalid JSON:', error.message);
    process.exit(1);
  }
  
  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in post)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate slug
  if (post.slug && !/^[a-z0-9-]+$/.test(post.slug)) {
    errors.push('Slug must be lowercase alphanumeric with hyphens only');
  }
  
  // Validate metaTitle length
  if (post.metaTitle && post.metaTitle.length > 70) {
    warnings.push(`metaTitle is ${post.metaTitle.length} chars (recommended: max 60)`);
  }
  
  // Validate metaDescription length
  if (post.metaDescription) {
    if (post.metaDescription.length < 120) {
      warnings.push(`metaDescription is short (${post.metaDescription.length} chars, recommended: 150-160)`);
    } else if (post.metaDescription.length > 170) {
      warnings.push(`metaDescription is long (${post.metaDescription.length} chars, recommended: 150-160)`);
    }
  }
  
  // Validate category
  if (post.category && !VALID_CATEGORIES.includes(post.category)) {
    warnings.push(`Unknown category: "${post.category}". Valid: ${VALID_CATEGORIES.join(', ')}`);
  }
  
  // Validate status
  if (post.status && !VALID_STATUSES.includes(post.status)) {
    errors.push(`Invalid status: "${post.status}". Must be: ${VALID_STATUSES.join(' or ')}`);
  }
  
  // Validate author
  if (post.author) {
    if (!post.author.name) {
      errors.push('Author must have a name');
    }
  }
  
  // Validate featuredImage
  if (post.featuredImage) {
    if (!post.featuredImage.url) {
      errors.push('Featured image must have a url');
    }
    if (!post.featuredImage.alt) {
      warnings.push('Featured image should have alt text for accessibility');
    }
  }
  
  // Validate sections
  if (post.sections && Array.isArray(post.sections)) {
    post.sections.forEach((section, index) => {
      if (!section.type) {
        errors.push(`Section ${index + 1}: Missing type`);
      } else if (!VALID_SECTION_TYPES.includes(section.type)) {
        errors.push(`Section ${index + 1}: Invalid type "${section.type}"`);
      }
      
      // Type-specific validation
      if (section.type === 'heading') {
        if (!section.id) {
          warnings.push(`Section ${index + 1} (heading): Missing id for anchor links`);
        }
        if (!section.level) {
          errors.push(`Section ${index + 1} (heading): Missing level`);
        }
      }
      
      if (section.type === 'image') {
        if (!section.url) {
          errors.push(`Section ${index + 1} (image): Missing url`);
        }
        if (!section.alt) {
          warnings.push(`Section ${index + 1} (image): Missing alt text`);
        }
      }
      
      if (section.type === 'faq') {
        if (!section.items || !Array.isArray(section.items)) {
          errors.push(`Section ${index + 1} (faq): Missing items array`);
        }
      }
    });
  }
  
  // Validate dates
  if (post.publishedAt) {
    const date = new Date(post.publishedAt);
    if (isNaN(date.getTime())) {
      errors.push('Invalid publishedAt date format (use ISO 8601)');
    }
  }
  
  // Print results
  console.log('─'.repeat(50));
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(e => console.log(`   • ${e}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(w => console.log(`   • ${w}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Post is valid!');
  }
  
  console.log('\n' + '─'.repeat(50));
  console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings`);
  
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Get file path from command line
const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node scripts/validate-blog-post.js <path-to-post.json>');
  console.log('Example: node scripts/validate-blog-post.js frontend/src/data/blog/posts/my-post.json');
  process.exit(1);
}

validatePost(filePath);
