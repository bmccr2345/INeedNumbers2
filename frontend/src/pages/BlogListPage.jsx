import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import BlogCard from '../components/blog/BlogCard';
import BlogSEO from '../components/blog/BlogSEO';
import EmailCapture from '../components/blog/EmailCapture';
import { blogPosts, categories } from '../data/blog/index';
import { ArrowLeft } from 'lucide-react';

const POSTS_PER_PAGE = 9;

const BlogListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visiblePosts, setVisiblePosts] = useState(POSTS_PER_PAGE);

  const selectedCategory = searchParams.get('category') || '';
  const selectedTag = searchParams.get('tag') || '';

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    return blogPosts
      .filter(post => post.status === 'published')
      .filter(post => !selectedCategory || post.category === selectedCategory)
      .filter(post => !selectedTag || post.tags?.includes(selectedTag))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [selectedCategory, selectedTag]);

  const displayedPosts = filteredPosts.slice(0, visiblePosts);
  const hasMore = visiblePosts < filteredPosts.length;

  const handleCategoryClick = (category) => {
    if (category === selectedCategory) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    searchParams.delete('tag');
    setSearchParams(searchParams);
    setVisiblePosts(POSTS_PER_PAGE);
  };

  const clearFilters = () => {
    setSearchParams({});
    setVisiblePosts(POSTS_PER_PAGE);
  };

  const loadMore = () => {
    setVisiblePosts(prev => prev + POSTS_PER_PAGE);
  };

  return (
    <>
      <BlogSEO isListPage />

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Real Estate Business Insights
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl">
              Expert tips, strategies, and insights to help you grow your real estate business, 
              track your success, and stay ahead of the competition.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide">
              <Button
                variant={!selectedCategory && !selectedTag ? 'default' : 'outline'}
                size="sm"
                onClick={clearFilters}
                className={!selectedCategory && !selectedTag ? 'bg-primary hover:bg-emerald-600' : ''}
              >
                All Posts
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryClick(category)}
                  className={selectedCategory === category ? 'bg-primary hover:bg-emerald-600' : ''}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filter Badge */}
        {selectedTag && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filtered by tag:</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedTag}
                <button onClick={clearFilters} className="ml-1 hover:text-primary">×</button>
              </Badge>
            </div>
          </div>
        )}

        {/* Posts Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">No posts found.</p>
              <Button onClick={clearFilters} variant="outline">
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedPosts.map((post, index) => (
                  <React.Fragment key={post.slug}>
                    <BlogCard post={post} />
                    {/* Insert email capture after 3rd post */}
                    {index === 2 && filteredPosts.length > 3 && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <EmailCapture source="blog-listing" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center mt-12">
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    size="lg"
                    className="px-8"
                  >
                    Load More Posts
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Email Capture */}
        {filteredPosts.length <= 3 && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <EmailCapture source="blog-listing-bottom" />
          </div>
        )}
      </div>
    </>
  );
};

export default BlogListPage;
