# Scene Management Structure

## Overview
The chat system has been refactored to use a centralized `pajonga.json` file that contains all scene information, making it easier to manage and modify the narrative flow.

## File Structure
```
public/
  pajonga.json          # Centralized scene configuration
  videos/              # Video files for scenes
    Scene-1.mp4
    Scene-2.mp4
    Scene-3.mp4
    Scene-4.mp4
  Scene-2-Book.pdf     # PDF document for Scene 2
  Scene-5.mp3          # Audio file for Scene 5
```

## Scene Object Structure

Each scene in `pajonga.json` is an object with the following properties:

```json
{
  "id": 1,                    // Unique scene identifier
  "script": "Scene content...", // The main narrative text
  "media": [                  // Array of media objects
    {
      "type": "video",        // Media type: "video", "audio", "pdf"
      "filePath": "/path/to/file", // File path relative to public folder
      "description": "Description text" // Text shown with media
    }
  ],
  "yesAction": {              // Action when user clicks "Iya"
    "type": "nextScene",      // Action type: "nextScene", "navigate", "stayInScene"
    "target": 2               // Target scene ID or URL
  },
  "noAction": {               // Action when user clicks "Tae"
    "type": "nextScene",      // Action type: "nextScene", "navigate", "stayInScene"
    "target": 2               // Target scene ID or URL
  }
}
```

## Action Types

### `nextScene`
- **Purpose**: Move to the next scene
- **Target**: Scene ID (number)
- **Behavior**: Updates `currentScene` state and continues the narrative

### `navigate`
- **Purpose**: Navigate to a different page
- **Target**: URL path (e.g., "/tenri", "/")
- **Behavior**: Redirects user to specified page

### `stayInScene`
- **Purpose**: Keep user in current scene
- **Target**: Not applicable
- **Behavior**: No scene change, user can continue interacting

## Media Types

### Video
```json
{
  "type": "video",
  "filePath": "/videos/Scene-1.mp4",
  "description": "Video description text"
}
```

### Audio
```json
{
  "type": "audio",
  "filePath": "/Scene-5.mp3",
  "description": "Audio description text"
}
```

### PDF
```json
{
  "type": "pdf",
  "filePath": "/Scene-2-Book.pdf",
  "description": "PDF description text"
}
```

## Adding New Scenes

To add a new scene:

1. **Add to pajonga.json**:
```json
{
  "id": 7,
  "script": "Your new scene script here...",
  "media": [
    {
      "type": "video",
      "filePath": "/videos/Scene-7.mp4",
      "description": "Description for Scene 7"
    }
  ],
  "yesAction": {
    "type": "nextScene",
    "target": 8
  },
  "noAction": {
    "type": "stayInScene"
  }
}
```

2. **Add media files** to the appropriate folders in `public/`

3. **Update existing scenes** to reference the new scene if needed

## Modifying Existing Scenes

### Change Script
Edit the `script` property in the scene object.

### Add/Remove Media
Modify the `media` array to add, remove, or change media elements.

### Change Navigation
Update `yesAction` and `noAction` properties to change where users go after responding.

## Benefits of This Structure

1. **Centralized Management**: All scene data in one place
2. **Easy Modifications**: Change scripts, media, or navigation without touching code
3. **Scalable**: Easy to add new scenes or modify existing ones
4. **Maintainable**: Clear separation between data and logic
5. **Consistent**: Standardized format for all scenes
6. **Flexible**: Support for different media types and navigation patterns

## Example Scene Flow

```
Scene 1 → User clicks "Iya" → Shows Scene-1.mp4 → Scene 2
Scene 1 → User clicks "Tae" → Scene 2
Scene 2 → User clicks "Iya" → Shows Scene-2.mp4 + PDF → Scene 3
Scene 2 → User clicks "Tae" → Stays in Scene 2
Scene 6 → User clicks "Iya" → Navigate to /tenri
Scene 6 → User clicks "Tae" → Navigate to /
```

## Technical Implementation

- **Frontend**: `app/chat/page.js` loads scenes from `/pajonga.json`
- **Backend**: `app/api/chat/route.js` uses scene data for context
- **State Management**: React state tracks current scene and conversation flow
- **Media Handling**: Dynamic rendering based on media type and properties
