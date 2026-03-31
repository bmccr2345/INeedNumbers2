import React from 'react';
import { Twitter, Facebook, Linkedin, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const ShareButtons = ({ post }) => {
  const shareUrl = post.canonicalUrl || `https://ineednumbers.com/blog/${post.slug}`;
  const shareTitle = post.title;

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 mr-1 hidden sm:inline">Share:</span>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-8 h-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-500"
        onClick={() => window.open(shareLinks.twitter, '_blank', 'width=550,height=435')}
        title="Share on Twitter"
      >
        <Twitter className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="w-8 h-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600"
        onClick={() => window.open(shareLinks.facebook, '_blank', 'width=550,height=435')}
        title="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="w-8 h-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-700"
        onClick={() => window.open(shareLinks.linkedin, '_blank', 'width=550,height=435')}
        title="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="w-8 h-8 p-0 rounded-full hover:bg-gray-100"
        onClick={copyToClipboard}
        title="Copy link"
      >
        <LinkIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ShareButtons;
