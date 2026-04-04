import React, { useEffect, useState } from 'react';

const PdfLoadingPopup = ({ isVisible, onClose }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setFadeOut(false);
      // Start fade out after 2.5 seconds, then fully close at 3 seconds
      const fadeTimer = setTimeout(() => setFadeOut(true), 2500);
      const closeTimer = setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px 28px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Loading spinner */}
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #16a34a',
            borderRadius: '50%',
            animation: 'pdfPopupSpin 1s linear infinite',
            margin: '0 auto 20px auto',
          }}
        />
        <p
          style={{
            fontSize: '16px',
            color: '#374151',
            lineHeight: '1.6',
            margin: 0,
            fontWeight: '500',
          }}
        >
          One second, we're building your report...dialing in the numbers now
        </p>
      </div>

      {/* CSS animation for spinner */}
      <style>
        {`@keyframes pdfPopupSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }`}
      </style>
    </div>
  );
};

export default PdfLoadingPopup;
