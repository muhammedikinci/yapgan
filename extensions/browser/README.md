# Yapgan Browser Extension

Universal knowledge capture extension for Chrome/Brave browsers. Capture highlighted text from any website and save it to your Yapgan knowledge base.

## Features

- 🌟 **Universal Capture**: Works on any website
- ✨ **One-Click Save**: Highlight text → Click extension → Save
- 🏷️ **Smart Tagging**: Add tags to organize your notes
- 🔗 **Source Tracking**: Automatically captures source URL
- 🔐 **Secure**: JWT-based authentication
- 💾 **Offline-First**: Saves to your self-hosted backend

## Installation

### Development Mode

1. **Build the Extension** (already built in `extensions/browser/`)

2. **Load in Chrome/Brave**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `extensions/browser/` directory

3. **Configure**:
   - Click the extension icon
   - **New Users**: Click "Don't have an account? Register"
     - Enter your email and password
     - Confirm password
     - Set API URL (default: `http://localhost:8080`)
     - Click "Create Account"
   - **Existing Users**:
     - Enter your email and password
     - Set API URL (default: `http://localhost:8080`)
     - Click "Login"

## Usage

### First Time Setup

1. Make sure your Yapgan backend is running:

   ```bash
   cd /path/to/yapgan
   ENV=dev go run cmd/api/main.go
   ```

2. **Register a new account** (easiest way):
   - Click the Yapgan extension icon
   - Click "Don't have an account? Register"
   - Enter email, password, and confirm password
   - Click "Create Account"
   - You're automatically logged in! ✅

   **OR Register via API** (alternative):

   ```bash
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"yourpassword"}'
   ```

3. Start capturing notes!

### Capturing Notes

1. **Highlight text** on any webpage
2. **Click** the Yapgan extension icon (⭐)
3. The popup will open with:
   - **Content**: Pre-filled with your highlighted text
   - **Title**: Enter a descriptive title
   - **Tags**: Optional comma-separated tags (e.g., "research, ai, javascript")
   - **Source URL**: Auto-filled with current page URL
4. Click **"💾 Save Note"**
5. ✅ Done! Your note is saved

### Example Workflow

**Scenario**: You're reading an article about React hooks

1. Highlight the important paragraph
2. Click extension icon
3. Enter title: "React useEffect cleanup pattern"
4. Add tags: "react, hooks, javascript"
5. Save
6. The note is now in your Yapgan database and searchable!

## Configuration

### API URL

Default: `http://localhost:8080`

For custom backend URL:

- Click extension icon
- Enter API URL in the login form
- Login

### Storage

The extension stores:

- `yapgan_access_token`: JWT access token
- `yapgan_api_url`: Backend API URL
- `yapgan_user_email`: Logged-in user email

To clear storage:

- Click the logout button (🚪) in the extension popup

## Architecture

### Files

```
extensions/browser/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js           # Service worker (lifecycle events)
├── content.js             # Content script (text selection)
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic (API calls)
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

### API Integration

The extension interacts with these backend endpoints:

- **POST** `/api/auth/register` - User registration (new!)
- **POST** `/api/auth/login` - User authentication
- **POST** `/api/notes` - Create new note

Register request format:

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Create note request format:

```json
{
  "title": "Note title",
  "content_md": "Note content in markdown",
  "source_url": "https://example.com",
  "tags": ["tag1", "tag2"]
}
```

## Troubleshooting

### "Registration failed" error

- Check that backend is running: `http://localhost:8080/health`
- Verify email format is valid
- Password must be at least 6 characters
- Check API URL is correct
- Email might already be registered (try login instead)

### "Login failed" error

- Check that backend is running: `http://localhost:8080/health`
- Verify email/password are correct
- Check API URL is correct
- If you just registered, account should work immediately

### Passwords don't match

- Make sure both password fields contain the same text
- Check for extra spaces
- Re-type carefully

### "Failed to save note" error

- Check that you're logged in
- Verify backend is running
- Check browser console for detailed errors

### Text not captured

- Make sure text is highlighted before clicking extension
- Try clicking the extension icon after highlighting
- Check content script is injected (browser console)

### Session expired

- Click logout button and login again
- JWT tokens expire after 15 minutes (access token)

## Development

### Testing Locally

1. Start backend:

   ```bash
   ENV=dev go run cmd/api/main.go
   ```

2. Load extension in Chrome (developer mode)

3. Test on any website:
   - GitHub README
   - Medium article
   - ChatGPT conversation
   - Documentation site

### Debugging

- Open browser console (F12) → Console tab
- Check extension popup console: Right-click extension → Inspect popup
- View background worker: `chrome://extensions/` → Service worker → Inspect

### Known Limitations

- Requires backend to be running
- Chrome/Brave only (Manifest V3)
- No offline queue (notes must be saved immediately)
- No rich text formatting (markdown only)
- Cannot capture from chrome://, about:// or extension pages (browser security)

## Roadmap

- [ ] Firefox support
- [ ] Context menu "Save to yapgan"
- [ ] Offline queue for saving when backend is unavailable
- [ ] Rich text editor
- [ ] Auto-suggest tags based on content
- [ ] Quick view of recent notes
- [ ] Keyboard shortcuts

## License

MIT License - See LICENSE file in root directory
