# ChatGPT Model Picker Chrome Extension

## Project Overview
A Chrome extension that adds keyboard shortcuts for quickly selecting ChatGPT models on chatgpt.com. Created to solve the workflow friction of switching models when starting new chats.

## Key Features
- **Cmd+Shift+P**: Opens the model picker
- **Arrow keys**: Navigate through available models
- **Enter**: Select the highlighted model
- **Type to filter**: Filter models by typing partial names (e.g., "4o", "o3")
- **Smart positioning**: Dropdown appears below the button instead of upper-left corner
- **Focus management**: Returns keyboard focus to chat input after selection

## Architecture

### Coding conventions
- All text-based files (e.g., `.txt`, `.md`, `.json`, `.js`, `.py`, etc.) should end with a single trailing newline (`\n`).
- Do not add extra blank lines at the end — just one newline.

### Files
- `manifest.json`: Chrome extension configuration (Manifest V3)
- `content.js`: Main functionality injected into chatgpt.com pages
- `README.md`: User installation and usage instructions

### Key Components

#### Model Picker Detection (`findModelPicker`)
- Uses multiple CSS selectors to find the ChatGPT model switcher button
- Handles both `chatgpt.com` and `chat.openai.com` domains
- Falls back to searching for buttons containing model names if primary selectors fail

#### Dropdown Management (`findModelList`, `getModelItems`)
- Locates the dropdown menu using various selectors (`[role="menu"]`, `[role="listbox"]`, etc.)
- Extracts model items from the dropdown
- Handles different UI frameworks (React/Radix components)

#### Positioning System
- Captures button coordinates before triggering click (button becomes invisible after click)
- Detects when dropdown appears in wrong location (upper-left corner)
- Repositions dropdown below the button while preserving original width
- Handles timing issues with multiple retry attempts

#### Keyboard Navigation
- **Cmd+Shift+P**: Toggle picker (chosen to avoid Chrome conflicts)
- **Arrow keys**: Navigate filtered results
- **Enter**: Select current item
- **Escape**: Close picker
- **Typing**: Filter models by partial name matching
- **Backspace**: Remove filter characters

#### React Component Interaction
- Uses Space key events (more reliable with React than click events)
- Falls back to standard click events
- Handles Radix UI components and their state management

## Technical Challenges Solved

### 1. Button Detection
**Problem**: ChatGPT's model picker button sometimes appears as invisible/zero-sized
**Solution**: Search for alternative visible buttons containing model names as fallback

### 2. Dropdown Positioning
**Problem**: Programmatically triggered dropdown appears at (0,0) instead of below button
**Solution**: Capture button position before click, then reposition dropdown manually

### 3. React Event Handling
**Problem**: Standard click events don't trigger React dropdown
**Solution**: Use Space key events on focused button, which React handles properly

### 4. Filter Highlighting
**Problem**: Multiple items showing selection highlighting during filtering
**Solution**: Clear all highlights before applying new selection to filtered results

### 5. Timing Issues
**Problem**: Dropdown takes time to appear and render
**Solution**: Multiple retry attempts with increasing delays

## Browser Compatibility
- Chrome (Manifest V3)
- Works on both chatgpt.com and chat.openai.com
- No special permissions required - uses content scripts with host matches

## Development Notes
- Extension uses content script injection (no background script needed)
- No special permissions required - only uses content scripts with host pattern matching
- Robust error handling for UI changes
- No hardcoded model names - works with any models in the dropdown

## Future Considerations
- Visual flash during repositioning (minor cosmetic issue)
- Could add more keyboard shortcuts for specific models
- Could remember last selected model per session
- May need updates if ChatGPT significantly changes their UI structure

## Installation
Load as unpacked extension in Chrome Developer mode. See README.md for detailed instructions.
