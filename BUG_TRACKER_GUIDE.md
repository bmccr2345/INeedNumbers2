# 🐛 Bug Tracker & Debugging Tools - User Guide

## Overview
Added comprehensive debugging tools to help diagnose production authentication issues.

---

## 📍 Where to Find Bug Tracker

### 1. P&L Tracker Page
- Navigate to **P&L Tracker** (dashboard → P&L tab)
- Look for **red "Debug Info" button** in bottom-right corner

### 2. Dashboard Overview Page
- Go to **Dashboard** (main overview page)
- Look for **red "Debug Info" button** in bottom-right corner

---

## 🔧 How to Use Bug Tracker

### Step 1: Open Debug Panel
Click the red **"Debug Info"** button in the bottom-right corner

### Step 2: Review Information
The debug panel shows:
- **Quick Status** - Authentication, cookies, backend URL
- **Full Debug Info** - Complete technical details in JSON format

### Step 3: Copy Debug Info
Click **"Copy All Debug Info"** button to copy everything to clipboard

### Step 4: Send to Support
Paste the copied information in your communication with support

---

## 📊 What Information Is Captured

### Environment Details
- Browser type and version
- Operating system
- Cookie settings
- Online status

### Authentication Status
- Whether you're authenticated
- If cookies are present
- If backend URL is configured correctly
- API response status

### Configuration
- REACT_APP_BACKEND_URL value
- Current page URL
- Environment variables

### Cookies & Storage
- Number of cookies present
- Cookie names (values hidden for security)
- LocalStorage keys
- Whether auth tokens exist

### Network & Performance
- Connection type
- Network speed
- Memory usage
- Screen resolution

### Console Errors
- Recent JavaScript errors (last 10)
- Timestamps of errors

---

## ✨ Fairy AI Coach Added to Desktop

### Where to Find It
**Dashboard Overview Page** (for PRO users)
- Located between AI Coach Banner and Active Deals
- Green card with Sparkles icon
- "Your 3-Day Pro Success Guide" subtitle

### How to Use It
1. Click **"Start Your Journey"** button
2. Onboarding wizard opens as modal
3. Follow the 3-day guided experience
4. Close anytime and resume later

### Features
- Day 1: Foundation & Setup
- Day 2: Building Habits
- Day 3: Mastery & Optimization
- Progress tracking
- Tips and recommendations

---

## 🎯 Quick Troubleshooting Guide

### If P&L Shows "Authentication Required"

1. **Open Bug Tracker** (red button in corner)
2. **Check Quick Status**:
   - ❌ "Not Authenticated" → Copy debug info and send to support
   - ❌ "Cookies: None" → Browser blocking cookies
   - ❌ "Backend URL: NOT SET" → Environment variable issue

3. **Copy Full Debug Info**
4. **Send to support** with description of issue

### What to Look For in Debug Info

**Good Status (Working):**
```
Auth Status: ✓ Authenticated
Cookies Enabled: ✓ Yes
Has Cookies: ✓ Yes (3)
Backend URL: https://agent-financials.emergent.host
```

**Bad Status (Not Working):**
```
Auth Status: ✗ Not Authenticated
Cookies Enabled: ✗ No
Has Cookies: ✗ None
Backend URL: NOT SET
```

---

## 🔐 Privacy & Security

### What's Safe to Share
- ✅ Debug info JSON (no sensitive data)
- ✅ Cookie presence (not values)
- ✅ Environment variables shown
- ✅ Error messages

### What's NOT Included
- ❌ Cookie values (HttpOnly, secure)
- ❌ Passwords
- ❌ API keys
- ❌ Personal data

The debug tool only captures:
- Configuration information
- Status indicators
- Error messages
- Technical metadata

**It's safe to share debug info with support!**

---

## 🚀 Using Bug Tracker for Support

### Template Message

```
Hi, I'm experiencing authentication issues with [feature name].

Here's my debug information:

[Paste copied debug info here]

Issue description:
- What I'm trying to do: [e.g., "View P&L Tracker"]
- What happens: [e.g., "Shows 'Authentication required'"]
- When it started: [e.g., "After latest deployment"]
- Browser: [e.g., "Chrome on Mac"]

Screenshot: [If available]
```

### What Support Needs

1. **Debug Info JSON** (from Copy button)
2. **Description** of what you're trying to do
3. **Screenshot** if possible
4. **Browser** type and OS

---

## 📱 Mobile Note

Bug Tracker works on mobile too!
- Appears as floating red button
- Tap to open debug panel
- Copy works on mobile browsers
- Same information captured

---

## 🔄 Refresh Debug Info

If something changes:
1. Click **"Refresh"** button in debug panel
2. Re-collects all current information
3. Copy updated info

Use this if:
- You logged in/out
- Changed settings
- Cleared cookies
- After retrying operation

---

## ⚡ Quick Actions

### For Authentication Issues
1. Open Bug Tracker
2. Look at "Auth Status" in Quick Status
3. If "Not Authenticated", copy full info
4. Send to support immediately

### For P&L Data Not Loading
1. Open Bug Tracker on P&L page
2. Check "Backend URL" in Quick Status
3. Copy full debug info
4. Include what data isn't loading

### For General Issues
1. Open Bug Tracker
2. Click "Refresh" to get current state
3. Copy all info
4. Describe issue in message

---

## 📞 Need Help?

**With Bug Tracker itself:**
- Should appear as red button in bottom-right
- If not visible, refresh page
- Works on all modern browsers

**With Production Issues:**
1. Use Bug Tracker to collect info
2. Copy the JSON output
3. Send to support with description
4. Include screenshots if helpful

---

## ✅ Success Indicators

Debug panel shows these when working correctly:

| Indicator | Good Status | Bad Status |
|-----------|-------------|------------|
| Auth Status | ✓ Authenticated | ✗ Not Authenticated |
| Cookies Enabled | ✓ Yes | ✗ No |
| Has Cookies | ✓ Yes (3+) | ✗ None |
| Backend URL | Set correctly | NOT SET |

If all show "Good Status" but feature still broken:
- Copy debug info anyway
- Describe specific issue
- Send to support

---

**Added:** October 30, 2025  
**Version:** 1.0  
**Components:** BugTracker.js, integrated into PnLPanel and HomepagePanel
