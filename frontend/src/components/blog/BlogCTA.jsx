import React from 'react';
import { Link } from 'react-router-dom';

const BlogCTA = ({ cta }) => {
  if (!cta) return null;

  return (
    <div className="my-12 p-8 md:p-12 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-center">
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
        {cta.headline}
      </h3>
      <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
        {cta.body}
      </p>
      <Link
        to={cta.buttonUrl}
        className="inline-block bg-primary hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
      >
        {cta.buttonText}
      </Link>
    </div>
  );
};

export default BlogCTA;
