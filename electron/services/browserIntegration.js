const { BrowserView, BrowserWindow, session } = require('electron');

class BrowserIntegrator {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.sessions = {};
    this.serviceConfigs = {
      claude: {
        name: 'Claude',
        url: 'https://claude.ai/chats',
        selectors: {
          input: '.prompt-textarea',
          sendButton: 'button[type="submit"]',
          responseContainer: '.prose'
        }
      },
      chatgpt: {
        name: 'ChatGPT',
        url: 'https://chat.openai.com',
        selectors: {
          input: '#prompt-textarea',
          sendButton: 'button[data-testid="send-button"]',
          responseContainer: '.markdown'
        }
      },
      grok: {
        name: 'Grok',
        url: 'https://grok.x.ai',
        selectors: {
          input: 'textarea[placeholder="Message Grok"]',
          sendButton: 'button[aria-label="Send message"]',
          responseContainer: '.message-content[data-message-author-role="assistant"]'
        }
      },
      gemini: {
        name: 'Gemini',
        url: 'https://gemini.google.com/app',
        selectors: {
          input: 'textarea[placeholder="Message Gemini"]',
          sendButton: 'button[aria-label="Send message"]',
          responseContainer: '.response-container'
        }
      }
    };
  }

  async createSession(id) {
    if (!this.serviceConfigs[id]) {
      throw new Error(`Unknown service: ${id}`);
    }

    const config = this.serviceConfigs[id];
    
    // Create persistent session storage
    const browserSession = session.fromPartition(`persist:${id}`);
    
    // Create browser view
    const view = new BrowserView({
      webPreferences: {
        session: browserSession,
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    // Set initial size (hidden)
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    
    // Add to window but keep hidden
    this.mainWindow.addBrowserView(view);
    
    // Navigate to service
    await view.webContents.loadURL(config.url);
    
    // Store session
    this.sessions[id] = {
      id,
      name: config.name,
      url: config.url,
      view,
      selectors: config.selectors,
      isLoggedIn: false
    };
    
    return this.sessions[id];
  }

  async showLoginUI(id) {
    const session = this.sessions[id];
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    
    // Resize view to be visible
    const bounds = this.mainWindow.getBounds();
    session.view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
    
    // Bring to front
    this.mainWindow.setTopBrowserView(session.view);
    
    // Return the view so caller can monitor login status
    return session.view;
  }

  async hideLoginUI(id) {
    const session = this.sessions[id];
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    
    // Hide view
    session.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }

  isLoggedInUrl(id, url) {
    switch (id) {
      case 'claude':
        return url.includes('claude.ai/chats');
      case 'chatgpt':
        return url.includes('chat.openai.com/c/');
      case 'grok':
        return url.includes('grok.x.ai/chat');
      case 'gemini':
        return url.includes('gemini.google.com/app');
      default:
        return false;
    }
  }

  async setLoginStatus(id, status) {
    const session = this.sessions[id];
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    
    session.isLoggedIn = status;
    return session;
  }

  async sendPrompt(id, prompt) {
    const session = this.sessions[id];
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    if (!session.isLoggedIn) {
      throw new Error(`Session ${id} not logged in`);
    }
    
    // Execute script to interact with the page
    await session.view.webContents.executeJavaScript(`
      (async () => {
        try {
          // Focus input field
          const inputField = document.querySelector('${session.selectors.input}');
          if (!inputField) throw new Error('Input field not found');
          
          // Set prompt
          inputField.value = ${JSON.stringify(prompt)};
          inputField.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Click send button
          const sendButton = document.querySelector('${session.selectors.sendButton}');
          if (!sendButton) throw new Error('Send button not found');
          sendButton.click();
          
          return true;
        } catch (error) {
          console.error(error);
          return false;
        }
      })();
    `);
  }
  
  async getResponse(id) {
    const session = this.sessions[id];
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    
    // Wait for response to appear
    return session.view.webContents.executeJavaScript(`
      new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 60; // 30 seconds (checking every 500ms)
        
        // Check if response is already there
        const checkResponse = () => {
          const responseEl = document.querySelector('${session.selectors.responseContainer}');
          if (responseEl && responseEl.textContent.trim()) {
            resolve(responseEl.textContent);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkResponse, 500);
          } else {
            resolve('No response received after timeout');
          }
        };
        
        checkResponse();
      });
    `);
  }

  getSession(id) {
    return this.sessions[id];
  }

  getAllSessions() {
    return Object.values(this.sessions);
  }
}

module.exports = BrowserIntegrator;
