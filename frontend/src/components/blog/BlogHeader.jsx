import React from 'react';
import { Badge } from '../ui/badge';
import { Clock, Calendar, User } from 'lucide-react';
import ShareButtons from './ShareButtons';

const BlogHeader = ({ post }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <header className="mb-8">
      {/* Featured Image */}
      {post.featuredImage?.url && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8 shadow-lg">
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            width={post.featuredImage.width || 1200}
            height={post.featuredImage.height || 630}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Category Badge */}
      <Badge className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full mb-4">
        {post.category}
      </Badge>

      {/* Title */}
      <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {post.title}
      </h1>

      {/* Author Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b border-gray-200">
        {/* Author */}
        <div className="flex items-center gap-2">
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{post.author?.name || 'INN Team'}</p>
            {post.author?.role && (
              <p className="text-xs text-gray-500">{post.author.role}</p>
            )}
          </div>
        </div>

        <span className="hidden sm:block text-gray-300">|</span>

        {/* Date */}
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(post.publishedAt)}</span>
        </div>

        <span className="hidden sm:block text-gray-300">|</span>

        {/* Read Time */}
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{post.estimatedReadTime} min read</span>
        </div>

        {/* Share Buttons */}
        <div className="ml-auto">
          <ShareButtons post={post} />
        </div>
      </div>
    </header>
  );
};

export default BlogHeader;
