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
