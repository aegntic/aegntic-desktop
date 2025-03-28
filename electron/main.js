const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const BrowserIntegrator = require('./services/browserIntegration');
const ResponseHandler = require('./services/responseHandler');
const ObsidianIntegrator = require('./services/obsidianIntegration');

// Keep a global reference of the window object and services
let mainWindow;
let browserIntegrator;
let responseHandler;
let obsidianIntegrator;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  // Initialize services
  browserIntegrator = new BrowserIntegrator(mainWindow);
  responseHandler = new ResponseHandler(browserIntegrator);
  obsidianIntegrator = new ObsidianIntegrator();

  // Load the React app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../client/build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Set up IPC handlers
  setupIpcHandlers();

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  // Get available models
  ipcMain.handle('get-available-models', async () => {
    try {
      // Initialize sessions for models if they don't exist
      const modelIds = ['claude', 'chatgpt', 'grok', 'gemini'];
      const models = [];

      for (const id of modelIds) {
        let session = browserIntegrator.getSession(id);
        if (!session) {
          session = await browserIntegrator.createSession(id);
        }
        
        models.push({
          id: session.id,
          name: session.name,
          isLoggedIn: session.isLoggedIn
        });
      }
      
      return models;
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  });

  // Login to a model
  ipcMain.handle('login-to-model', async (event, modelId) => {
    try {
      const view = await browserIntegrator.showLoginUI(modelId);
      
      return new Promise((resolve) => {
        // Monitor URL changes to detect successful login
        const urlChangeHandler = (e, url) => {
          if (browserIntegrator.isLoggedInUrl(modelId, url)) {
            // Hide login UI
            browserIntegrator.hideLoginUI(modelId);
            // Update login status
            browserIntegrator.setLoginStatus(modelId, true);
            // Remove listener
            view.webContents.removeListener('did-navigate', urlChangeHandler);
            // Resolve with success
            resolve({ success: true });
          }
        };
        
        view.webContents.on('did-navigate', urlChangeHandler);
        
        // Also check the current URL after a short delay
        // (in case we're already logged in)
        setTimeout(() => {
          view.webContents.getURL().then(url => {
            if (browserIntegrator.isLoggedInUrl(modelId, url)) {
              // Hide login UI
              browserIntegrator.hideLoginUI(modelId);
              // Update login status
              browserIntegrator.setLoginStatus(modelId, true);
              // Remove listener
              view.webContents.removeListener('did-navigate', urlChangeHandler);
              // Resolve with success
              resolve({ success: true });
            }
          });
        }, 1000);
      });
    } catch (error) {
      console.error(`Error logging in to ${modelId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Cancel login
  ipcMain.handle('cancel-login', async (event, modelId) => {
    try {
      await browserIntegrator.hideLoginUI(modelId);
      return { success: true };
    } catch (error) {
      console.error(`Error canceling login for ${modelId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Send prompt to selected models
  ipcMain.handle('send-prompt', async (event, prompt, modelIds) => {
    try {
      // Start collecting responses asynchronously
      responseHandler.collectResponses(prompt, modelIds).then(responses => {
        // Send responses back to renderer as they come in
        mainWindow.webContents.send('response-update', responses);
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error sending prompt:', error);
      return { success: false, error: error.message };
    }
  });

  // Export to Obsidian
  ipcMain.handle('export-to-obsidian', async (event, prompt) => {
    try {
      // If vault path not set, ask for it
      if (!obsidianIntegrator.vaultPath) {
        const result = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory'],
          title: 'Select Obsidian Vault'
        });
        
        if (result.canceled) {
          return { success: false, error: 'Vault selection canceled' };
        }
        
        await obsidianIntegrator.setVaultPath(result.filePaths[0]);
      }
      
      // Get current responses
      const responses = responseHandler.getResponses();
      
      // Generate mindmap
      const filePath = await obsidianIntegrator.addConversation(prompt, responses);
      
      return { success: true, filePath };
    } catch (error) {
      console.error('Error exporting to Obsidian:', error);
      return { success: false, error: error.message };
    }
  });

  // Set Obsidian vault path
  ipcMain.handle('set-obsidian-vault', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Obsidian Vault'
      });
      
      if (result.canceled) {
        return { success: false, error: 'Vault selection canceled' };
      }
      
      const folderPath = await obsidianIntegrator.setVaultPath(result.filePaths[0]);
      return { success: true, vaultPath: result.filePaths[0], folderPath };
    } catch (error) {
      console.error('Error setting Obsidian vault:', error);
      return { success: false, error: error.message };
    }
  });
}

// Create window when Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
