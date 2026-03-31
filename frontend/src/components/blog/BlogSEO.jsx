import React from 'react';
import { Helmet } from 'react-helmet-async';

const BlogSEO = ({ post, isListPage = false }) => {
  // List page SEO
  if (isListPage) {
    return (
      <Helmet>
        <title>Real Estate Business Insights | I Need Numbers Blog</title>
        <meta name="description" content="Expert tips, strategies, and insights for real estate agents. Learn how to grow your business, track commissions, and boost productivity." />
        <link rel="canonical" href="https://ineednumbers.com/blog" />
        <meta property="og:title" content="Real Estate Business Insights | I Need Numbers Blog" />
        <meta property="og:description" content="Expert tips, strategies, and insights for real estate agents. Learn how to grow your business, track commissions, and boost productivity." />
        <meta property="og:url" content="https://ineednumbers.com/blog" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
    );
  }

  // Single post SEO
  if (!post) return null;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.metaDescription,
    "image": post.featuredImage?.url ? `https://ineednumbers.com${post.featuredImage.url}` : undefined,
    "datePublished": post.publishedAt,
    "dateModified": post.updatedAt,
    "author": {
      "@type": "Person",
      "name": post.author?.name
    },
    "publisher": {
      "@type": "Organization",
      "name": "I Need Numbers",
      "logo": {
        "@type": "ImageObject",
        "url": "https://ineednumbers.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": post.canonicalUrl
    }
  };

  // Check if post has FAQ section
  const faqSection = post.sections?.find(s => s.type === 'faq');
  const faqSchema = faqSection ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqSection.items.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  } : null;

  return (
    <Helmet>
      <title>{post.metaTitle}</title>
      <meta name="description" content={post.metaDescription} />
      <link rel="canonical" href={post.canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={post.metaTitle} />
      <meta property="og:description" content={post.metaDescription} />
      <meta property="og:url" content={post.canonicalUrl} />
      <meta property="og:type" content="article" />
      {post.featuredImage?.url && (
        <meta property="og:image" content={`https://ineednumbers.com${post.featuredImage.url}`} />
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={post.metaTitle} />
      <meta name="twitter:description" content={post.metaDescription} />
      {post.featuredImage?.url && (
        <meta name="twitter:image" content={`https://ineednumbers.com${post.featuredImage.url}`} />
      )}
      
      {/* Article meta */}
      <meta property="article:published_time" content={post.publishedAt} />
      <meta property="article:modified_time" content={post.updatedAt} />
      <meta property="article:author" content={post.author?.name} />
      {post.tags?.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(articleSchema)}
      </script>
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
    </Helmet>
  );
};

export default BlogSEO;
