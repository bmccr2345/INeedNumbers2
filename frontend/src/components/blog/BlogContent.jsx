import React from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Link } from 'react-router-dom';
import { Lightbulb, AlertTriangle, Info } from 'lucide-react';

const BlogContent = ({ sections }) => {
  if (!sections || sections.length === 0) {
    return <p className="text-gray-500">No content available.</p>;
  }

  // Parse bold and italic in text
  const parseInlineStyles = (text) => {
    if (!text) return text;
    
    // Split by bold (**text**) and italic (*text*)
    const parts = [];
    let remaining = text;
    let key = 0;

    // Process bold first
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`bold-${key++}`}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    if (parts.length === 0) return text;

    // Process italic in the remaining string parts
    return parts.map((part, idx) => {
      if (typeof part !== 'string') return part;
      
      const italicParts = [];
      const italicRegex = /\*(.+?)\*/g;
      let italicLastIndex = 0;
      let italicMatch;

      while ((italicMatch = italicRegex.exec(part)) !== null) {
        if (italicMatch.index > italicLastIndex) {
          italicParts.push(part.slice(italicLastIndex, italicMatch.index));
        }
        italicParts.push(<em key={`italic-${idx}-${italicLastIndex}`}>{italicMatch[1]}</em>);
        italicLastIndex = italicRegex.lastIndex;
      }

      if (italicLastIndex < part.length) {
        italicParts.push(part.slice(italicLastIndex));
      }

      return italicParts.length > 0 ? italicParts : part;
    });
  };

  const renderSection = (section, index) => {
    switch (section.type) {
      case 'paragraph':
        return (
          <p key={index} className="text-lg text-gray-700 leading-relaxed mb-6">
            {parseInlineStyles(section.content)}
          </p>
        );

      case 'heading':
        if (section.level === 2) {
          return (
            <h2
              key={index}
              id={section.id}
              className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-4 scroll-mt-24"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {section.content}
            </h2>
          );
        }
        return (
          <h3
            key={index}
            id={section.id}
            className="text-xl font-semibold text-gray-800 mt-8 mb-3"
          >
            {section.content}
          </h3>
        );

      case 'list':
        const ListTag = section.ordered ? 'ol' : 'ul';
        const listClass = section.ordered ? 'list-decimal' : 'list-disc';
        return (
          <ListTag key={index} className={`${listClass} pl-6 text-lg text-gray-700 leading-relaxed mb-6 space-y-2`}>
            {section.items.map((item, i) => (
              <li key={i}>{parseInlineStyles(item)}</li>
            ))}
          </ListTag>
        );

      case 'callout':
        const calloutStyles = {
          tip: { icon: Lightbulb, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', iconColor: 'text-emerald-600' },
          warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', iconColor: 'text-amber-600' },
          info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', iconColor: 'text-blue-600' }
        };
        const style = calloutStyles[section.style] || calloutStyles.info;
        const CalloutIcon = style.icon;
        return (
          <Alert key={index} className={`${style.bg} ${style.border} border my-6`}>
            <CalloutIcon className={`h-5 w-5 ${style.iconColor}`} />
            <AlertDescription className={`${style.text} text-base ml-2`}>
              {parseInlineStyles(section.content)}
            </AlertDescription>
          </Alert>
        );

      case 'image':
        return (
          <figure key={index} className="my-8">
            <img
              src={section.url}
              alt={section.alt}
              className="w-full rounded-xl shadow-md"
              loading="lazy"
            />
            {section.caption && (
              <figcaption className="text-center text-sm text-gray-500 mt-3">
                {section.caption}
              </figcaption>
            )}
          </figure>
        );

      case 'cta-inline':
        return (
          <div key={index} className="my-10 p-8 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">{section.headline}</h3>
            <Link
              to={section.buttonUrl}
              className="inline-block bg-primary hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {section.buttonText}
            </Link>
          </div>
        );

      case 'faq':
        return (
          <Accordion key={index} type="single" collapsible className="my-6">
            {section.items.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-gray-200">
                <AccordionTrigger className="text-left text-lg font-medium text-gray-900 hover:text-primary py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-700 text-base pb-4">
                  {parseInlineStyles(item.answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        );

      case 'blockquote':
        return (
          <blockquote key={index} className="border-l-4 border-primary pl-6 my-6 italic text-gray-600">
            <p className="text-lg">{parseInlineStyles(section.content)}</p>
            {section.attribution && (
              <cite className="block mt-2 text-sm text-gray-500 not-italic">
                — {section.attribution}
              </cite>
            )}
          </blockquote>
        );

      case 'code':
        return (
          <pre key={index} className="my-6 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
            <code className={`language-${section.language || 'text'}`}>
              {section.content}
            </code>
          </pre>
        );

      case 'table':
        return (
          <div key={index} className="my-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  {section.headers.map((header, i) => (
                    <TableHead key={i} className="font-semibold text-gray-900">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.rows.map((row, rowIdx) => (
                  <TableRow key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIdx) => (
                      <TableCell key={cellIdx}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="prose prose-lg max-w-none">
      {sections.map((section, index) => renderSection(section, index))}
    </div>
  );
};

export default BlogContent;
