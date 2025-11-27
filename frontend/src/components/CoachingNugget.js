import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * CoachingNugget Component
 * Displays coaching insights/tips with a gradient background and animation
 * 
 * Props:
 * - children: The coaching text content (from Mobile Onboarding.docx)
 * - icon: Optional icon component to display (defaults to Lightbulb)
 */
const CoachingNugget = ({ children, icon: Icon = Lightbulb }) => {
  return (
    <div
      className="coaching-nugget"
      style={{
        background: 'linear-gradient(135deg, #ECFDF5 0%, #F0F9FF 100%)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '12px',
        padding: '20px 18px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        animation: 'fadeInUp 350ms ease-out',
        margin: '20px 0'
      }}
    >
      <Icon
        style={{
          width: '24px',
          height: '24px',
          color: '#0EA5E9',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
          flexShrink: 0,
          marginTop: '2px'
        }}
      />
      <p
        style={{
          fontSize: '15px',
          fontWeight: 500,
          color: '#0F172A',
          lineHeight: 1.5,
          maxWidth: '90%',
          margin: 0
        }}
      >
        {children}
      </p>
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CoachingNugget;
