import React, { useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BlogSEO from '../components/blog/BlogSEO';
import BlogHeader from '../components/blog/BlogHeader';
import BlogContent from '../components/blog/BlogContent';
import BlogSidebar, { TableOfContents } from '../components/blog/BlogSidebar';
import BlogCTA from '../components/blog/BlogCTA';
import BlogCard from '../components/blog/BlogCard';
import EmailCapture from '../components/blog/EmailCapture';
import { blogPosts } from '../data/blog/index';
import API_BASE_URL from '../config/api';

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Find the post by slug
  const post = useMemo(() => {
    return blogPosts.find(p => p.slug === slug && p.status === 'published');
  }, [slug]);

  // Load full post data (with sections) dynamically
  const [fullPost, setFullPost] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const loadPost = async () => {
      setIsLoading(true);
      try {
        // Dynamic import of the full post JSON
        const postModule = await import(`../data/blog/posts/${slug}.json`);
        setFullPost(postModule.default || postModule);
      } catch (error) {
        console.error('Failed to load post:', error);
        setFullPost(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadPost();
    }
  }, [slug]);

  // Track view
  useEffect(() => {
    if (slug && fullPost) {
      // Fire and forget - don't wait for response
      fetch(`${API_BASE_URL}/api/blog/view/${slug}`, {
        method: 'POST',
      }).catch(() => {
        // Silently fail - view tracking is not critical
      });
    }
  }, [slug, fullPost]);

  // Get related posts
  const relatedPosts = useMemo(() => {
    if (!fullPost?.relatedSlugs) return [];
    return fullPost.relatedSlugs
      .map(relatedSlug => blogPosts.find(p => p.slug === relatedSlug))
      .filter(Boolean)
      .slice(0, 3);
  }, [fullPost]);

  // Handle 404
  if (!isLoading && !fullPost) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/blog"
            className="inline-flex items-center text-primary hover:text-emerald-600 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <BlogSEO post={fullPost} />

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/blog"
            className="inline-flex items-center text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>

        {/* Main Content */}
        <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Header */}
          <BlogHeader post={fullPost} />

          {/* Mobile TOC */}
          <div className="lg:hidden mb-8">
            <TableOfContents sections={fullPost.sections} isCollapsible />
          </div>

          {/* Two Column Layout */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-12">
            {/* Main Content */}
            <div className="lg:col-span-8">
              <BlogContent sections={fullPost.sections} />

              {/* Post CTA */}
              <BlogCTA cta={fullPost.cta} />

              {/* Email Capture */}
              <div className="mt-12">
                <EmailCapture source={`blog-post-${slug}`} />
              </div>
            </div>

            {/* Sidebar - Desktop Only */}
            <div className="hidden lg:block lg:col-span-4">
              <BlogSidebar post={fullPost} relatedPosts={relatedPosts} />
            </div>
          </div>

          {/* Related Posts - Full Width on Mobile */}
          {relatedPosts.length > 0 && (
            <div className="mt-16 lg:hidden">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <BlogCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </>
  );
};

export default BlogPostPage;
