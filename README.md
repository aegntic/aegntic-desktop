# Aegntic Desktop

An Electron application that integrates multiple AI chat services (Claude, ChatGPT, Grok, Gemini) into a single desktop interface, with Obsidian mindmap generation.

## Features

- **Unified Interface**: Access multiple AI services in one application
- **Direct Browser Integration**: Uses your existing premium subscriptions without APIs
- **Persistent Login Sessions**: Log in once and maintain your session
- **Response Comparison**: View responses side-by-side or in tabs
- **Obsidian Integration**: Generate mindmaps in Obsidian from AI conversations
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (v6 or higher)
- Premium subscriptions to AI services (Claude Pro, ChatGPT Plus, etc.)
- [Obsidian](https://obsidian.md/) (optional, for mindmap generation)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/aegntic-desktop.git
   cd aegntic-desktop
   ```

2. Install dependencies:
   ```
   npm install
   cd client
   npm install
   cd ..
   ```

## Development

1. Start the React development server:
   ```
   npm run react-start
   ```

2. In a separate terminal, start the Electron app:
   ```
   npm run electron-start
   ```

## Production Build

1. Build the application:
   ```
   npm run build
   ```

2. The packaged application will be available in the `dist` directory.

## Usage

1. **Connect to AI Services**: 
   - Click the "Login" button next to each model
   - Complete the login process in the embedded browser
   - Once logged in, the model status will change to "Connected"

2. **Send Prompts**:
   - Select one or more AI models
   - Enter your prompt in the input field
   - Click "Send Prompt"
   - View responses in tabs or split view

3. **Export to Obsidian**:
   - Set up your Obsidian vault by clicking "Set Obsidian Vault"
   - After receiving responses, click "Export to Obsidian"
   - The mindmap will be created in the "AI Conversations" folder in your vault

## Architecture

- **Electron Main Process**: Manages browser sessions and IPC
- **React UI**: Provides the user interface
- **BrowserView Integration**: Embeds each AI service in a hidden browser view
- **Obsidian Integration**: Generates markdown files and opens them via the Obsidian URI protocol

## License

[MIT](LICENSE)
