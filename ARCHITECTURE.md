# Architecture Documentation

## Overview

4R Vocabulary Direct is a Chrome extension built using Manifest V3 specifications. The extension implements a lightweight, context-aware vocabulary lookup system using Shadow DOM for UI isolation and Service Workers for background processing.

## Core Components

### 1. Manifest V3 Configuration (`manifest.json`)

The manifest defines the extension's structure and permissions:

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [...],
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://*/*"]
}
```

**Key Features:**
- Service Worker instead of background pages (MV3 requirement)
- Minimal permissions for security
- Content script injection on all URLs
- Host permissions for API access

### 2. Content Script (`content.js`)

**Purpose:** Capture user interactions and display results

**Key Responsibilities:**
- Detect text selection on web pages
- Extract context sentences
- Create and manage Shadow DOM UI
- Communicate with background service worker

**Flow:**
```
User selects text → Extract word + context → Send to background
    ↓
Background responds → Display in Shadow DOM popup
```

**Shadow DOM Implementation:**
```javascript
shadowHost = document.createElement('div');
shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
```

Benefits:
- Style isolation from host page
- Prevents CSS conflicts
- Secure encapsulation
- Consistent appearance across sites

### 3. Background Service Worker (`background.js`)

**Purpose:** Handle API requests and caching

**Key Responsibilities:**
- Process word lookup requests
- Make API calls to dictionary service
- Manage translation cache
- Handle extension lifecycle events

**Message Handling:**
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOOKUP_WORD') {
    handleWordLookup(message.word, message.context)
      .then(result => sendResponse(result));
    return true; // Keep channel open for async
  }
});
```

**Caching Strategy:**
- In-memory Map for quick access
- Lowercase keys for case-insensitive lookup
- LRU-style eviction (max 100 entries)
- Reduces API calls and improves performance

### 4. Popup UI (`popup.html`, `popup.js`, `popup.css`)

**Purpose:** Extension settings and status display

**Features:**
- Enable/disable toggle
- Status indicator
- Usage instructions
- Extension information

**Communication:**
```javascript
chrome.storage.local.set({ enabled });
chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_EXTENSION' });
```

## Communication Architecture

### Message Passing Flow

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Content     │ ──msg──>│ Background       │<──msg── │   Popup      │
│  Script      │         │ Service Worker   │         │     UI       │
│              │<──resp──│                  │         │              │
└──────────────┘         └──────────────────┘         └──────────────┘
      │                           │                          │
      │                           │                          │
   Shadow DOM              API Requests              Chrome Storage
```

### Message Types

1. **LOOKUP_WORD**: Content → Background
   - Payload: `{ word, context }`
   - Response: `{ success, translation }`

2. **TOGGLE_EXTENSION**: Popup → Content
   - Payload: `{ enabled }`
   - Response: `{ received }`

3. **TRANSLATION_UPDATE**: Background → Content (future use)
   - For real-time updates if needed

## Data Flow

### Word Lookup Process

1. **User Selection**
   ```
   User selects text → mouseup event → handleSelection()
   ```

2. **Context Extraction**
   ```
   getContextSentence() → Find sentence boundaries → Extract full sentence
   ```

3. **Validation**
   ```
   Check length (1-50 chars)
   Check pattern (English letters only)
   Check if enabled
   ```

4. **API Request**
   ```
   Send message to background → Check cache → API call if needed
   ```

5. **Display Result**
   ```
   Format response → Update Shadow DOM → Position popup → Show
   ```

## Security Measures

### XSS Prevention

1. **HTML Escaping**
   ```javascript
   function escapeHtml(text) {
     const div = document.createElement('div');
     div.textContent = text;
     return div.innerHTML;
   }
   ```

2. **Content Security**
   - Use `textContent` for user input
   - Escape all API responses
   - Closed Shadow DOM mode

3. **Permission Scoping**
   - Minimal permissions requested
   - activeTab instead of tabs
   - Limited host permissions

### Data Privacy

- No personal data collection
- No tracking or analytics
- Local-only storage
- No third-party data sharing (except dictionary API)

## Performance Optimizations

### 1. Lazy Initialization
- Shadow DOM created only once
- Popup hidden/shown instead of recreated
- Service worker stays dormant until needed

### 2. Caching
- In-memory cache for translations
- Reduced API calls
- Faster subsequent lookups

### 3. Efficient DOM Operations
- Minimal DOM manipulation
- Reuse existing elements
- CSS transforms for positioning

### 4. Debouncing
- Small delay after mouseup before processing
- Prevents premature lookups

## API Integration

### Current: Free Dictionary API

**Endpoint:** `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`

**Response Format:**
```json
[{
  "word": "example",
  "phonetic": "/ɪɡˈzæmpəl/",
  "meanings": [{
    "partOfSpeech": "noun",
    "definitions": [{
      "definition": "...",
      "example": "..."
    }]
  }]
}]
```

**Error Handling:**
- 404: Word not found
- Network errors: Fallback message
- Timeout: Graceful degradation

### Future API Support

The architecture supports easy integration with:
- Google Translate API
- Microsoft Translator
- Custom dictionary services
- Multiple API fallbacks

## Extension Lifecycle

### Installation
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({ enabled: true });
  }
});
```

### Update
- Service worker reloads automatically
- Content scripts need page reload
- Settings persist across updates

### Uninstall
- All local storage cleared
- No traces left behind

## Browser Compatibility

### Minimum Requirements
- Chrome 88+ (Manifest V3 support)
- Edge 88+
- Any Chromium-based browser with MV3

### Feature Support
- ✅ Shadow DOM (all modern browsers)
- ✅ Service Workers (Chrome 88+)
- ✅ Chrome Storage API (all versions)
- ✅ Message Passing (all versions)

## Development Workflow

### Local Testing
1. Load unpacked extension
2. Make code changes
3. Reload extension
4. Refresh test pages
5. Check console for errors

### Debugging
- **Background**: chrome://extensions → Inspect service worker
- **Content**: F12 on webpage
- **Popup**: Right-click icon → Inspect popup

### Performance Monitoring
- Chrome DevTools → Performance
- Memory snapshots for leaks
- Network tab for API calls

## Future Enhancements

### Planned Features
1. **Offline Mode**: Local dictionary for offline use
2. **Custom Dictionaries**: User-defined word lists
3. **Word History**: Track looked-up words
4. **Spaced Repetition**: Learning mode
5. **Multi-language**: Support for other languages
6. **Customization**: Theme and style options

### Scalability Considerations
- Indexed DB for larger datasets
- Web Workers for heavy processing
- Service Worker persistence strategies
- CDN for static assets (if published)

## Testing Strategy

### Unit Testing
- Mock Chrome APIs
- Test individual functions
- Validate message handling

### Integration Testing
- Test complete lookup flow
- Verify cache behavior
- Check API error handling

### Manual Testing
- Various websites
- Different text selections
- Edge cases (long text, special characters)
- Performance on slow connections

## Deployment

### Development Build
- As-is file structure
- No minification
- Console logs enabled

### Production Build
- Minify JavaScript
- Remove console logs
- Optimize assets
- Package as .crx or upload to Chrome Web Store

## Maintenance

### Regular Updates
- Security patches
- API compatibility
- Bug fixes
- Feature improvements

### Monitoring
- User feedback
- Error reports
- Performance metrics
- API status

## Contributing Guidelines

1. Follow existing code style
2. Add comments for complex logic
3. Test thoroughly before PR
4. Update documentation
5. Follow security best practices
