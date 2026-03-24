/**
 * Platform Detection Utilities
 * 
 * Used for Apple App Store Guideline 3.1.1 compliance.
 * iOS Capacitor app users cannot sign up or purchase subscriptions in-app.
 */

/**
 * Detect if running inside the Capacitor iOS app wrapper.
 * Returns true ONLY for the native iOS app, not for:
 * - Desktop browsers
 * - Mobile Safari
 * - Android browsers
 * - Any other web context
 */
export const isIOSApp = () => {
  return window.Capacitor?.getPlatform?.() === "ios";
};

/**
 * Detect if running inside any Capacitor native app (iOS or Android).
 */
export const isNativeApp = () => {
  return window.Capacitor?.isNativePlatform?.() === true;
};

/**
 * Download a file - handles both web browsers and Capacitor native apps.
 * On native apps, uses the Share plugin to let users save/share the file.
 * On web, uses standard browser download.
 * 
 * @param {Blob} blob - The file blob to download
 * @param {string} filename - The suggested filename
 * @returns {Promise<{success: boolean, url?: string}>} - Result with optional URL for the file
 */
export const downloadFile = async (blob, filename) => {
  if (isNativeApp()) {
    try {
      // Convert blob to base64 for Capacitor
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result;
            
            // Use Capacitor Share plugin to open native share sheet
            if (window.Capacitor?.Plugins?.Share) {
              await window.Capacitor.Plugins.Share.share({
                title: filename,
                url: base64Data,
                dialogTitle: 'Save or Share PDF'
              });
              resolve({ success: true });
            } else {
              // Fallback: Open PDF in new tab/window
              const url = window.URL.createObjectURL(blob);
              window.open(url, '_blank');
              resolve({ success: true, url });
            }
          } catch (error) {
            console.error('Native share error:', error);
            // Fallback to opening in new window
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            resolve({ success: true, url });
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to download on native platform:', error);
      throw error;
    }
  } else {
    // Standard web browser download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return { success: true };
  }
};
