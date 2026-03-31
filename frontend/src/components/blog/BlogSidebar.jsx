import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { ChevronUp } from 'lucide-react';

const TableOfContents = ({ sections, isCollapsible = false }) => {
  const [activeId, setActiveId] = useState('');
  const [isOpen, setIsOpen] = useState(!isCollapsible);

  // Extract H2 headings for TOC
  const headings = sections?.filter(s => s.type === 'heading' && s.level === 2) || [];

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -66%',
        threshold: 0
      }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav className="bg-gray-50 rounded-xl p-5">
      {isCollapsible ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Table of Contents
          </h4>
          <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
        </button>
      ) : (
        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          Table of Contents
        </h4>
      )}

      {isOpen && (
        <ul className={`space-y-2 ${isCollapsible ? 'mt-4' : ''}`}>
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                onClick={() => scrollToSection(heading.id)}
                className={`text-sm text-left w-full transition-colors border-l-2 pl-3 py-1 ${
                  activeId === heading.id
                    ? 'text-primary font-medium border-primary'
                    : 'text-gray-600 hover:text-primary border-transparent hover:border-primary'
                }`}
              >
                {heading.content}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};

const BlogSidebar = ({ post, relatedPosts = [] }) => {
  return (
    <aside className="space-y-8">
      {/* Table of Contents - Sticky on desktop */}
      <div className="lg:sticky lg:top-24">
        {/* TOC */}
        <TableOfContents sections={post.sections} />

        {/* CTA Card */}
        {post.cta && (
          <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white">
            <h4 className="font-bold text-lg mb-2">{post.cta.headline}</h4>
            <p className="text-gray-300 text-sm mb-4">{post.cta.body}</p>
            <Link
              to={post.cta.buttonUrl}
              className="inline-block w-full text-center bg-primary hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
            >
              {post.cta.buttonText}
            </Link>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link key={tag} to={`/blog?tag=${tag}`}>
                  <Badge
                    variant="outline"
                    className="text-xs hover:bg-primary hover:text-white hover:border-primary transition-colors cursor-pointer"
                  >
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Related Articles
            </h4>
            <div className="space-y-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  to={`/blog/${relatedPost.slug}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h5 className="text-sm font-medium text-gray-900 line-clamp-2">
                    {relatedPost.title}
                  </h5>
                  <p className="text-xs text-gray-500 mt-1">
                    {relatedPost.estimatedReadTime} min read
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export { TableOfContents };
export default BlogSidebar;
