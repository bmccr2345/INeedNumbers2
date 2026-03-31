import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, User } from 'lucide-react';

const BlogCard = ({ post }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Link to={`/blog/${post.slug}`} className="block group">
      <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md">
        {/* Featured Image */}
        <div className="relative aspect-video overflow-hidden">
          {post.featuredImage?.url ? (
            <img
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              width={post.featuredImage.width || 1200}
              height={post.featuredImage.height || 630}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-primary/40 text-4xl font-bold">INN</span>
            </div>
          )}
          {/* Category Badge */}
          <Badge className="absolute top-3 left-3 bg-primary/90 hover:bg-primary text-white text-xs font-medium px-3 py-1">
            {post.category}
          </Badge>
        </div>

        <CardContent className="p-5">
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors mb-2">
            {post.title}
          </h3>

          {/* Excerpt */}
          <p className="text-gray-600 text-sm line-clamp-3 mb-4">
            {post.excerpt}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              {post.author?.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
              )}
              <span>{post.author?.name || 'INN Team'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{post.estimatedReadTime} min read</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default BlogCard;
