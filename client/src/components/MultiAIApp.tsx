import React, { useState, useEffect, useRef } from 'react';
import ModelSelector from './ModelSelector';
import PromptInput from './PromptInput';
import ResponseView from './ResponseView';
import HistoryPanel from './HistoryPanel';
import SettingsPanel from './SettingsPanel';

// Use a type assertion for Electron's IPC renderer
const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

// Type definitions
interface AIModel {
  id: string;
  name: string;
  isLoggedIn: boolean;
}

interface Response {
  modelId: string;
  modelName: string;
  content: string;
  isComplete?: boolean;
  error?: boolean;
  timestamp: number;
  prompt?: string;
}

interface Conversation {
  id: string;
  prompt: string;
  responses: Record<string, Response>;
  timestamp: number;
  exportedToObsidian: boolean;
}

interface AppSettings {
  theme: 'light' | 'dark';
  responseViewMode: 'tabs' | 'split';
  autoExportToObsidian: boolean;
  obsidianVaultPath: string | null;
}

const MultiAIApp: React.FC = () => {
  // App state
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [loginModelId, setLoginModelId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // UI state
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    responseViewMode: 'tabs',
    autoExportToObsidian: false,
    obsidianVaultPath: null
  });
  const [history, setHistory] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
  // Refs
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    // Initialize available models
    const fetchModels = async () => {
      try {
        const models = await ipcRenderer.invoke('get-available-models');
        setAvailableModels(models);
      } catch (error) {
        console.error('Failed to fetch models:', error);
        setErrorMessage('Failed to fetch models. Please restart the application.');
      }
    };
    
    // Load app settings
    const loadSettings = async () => {
      try {
        const result = await ipcRenderer.invoke('get-app-settings');
        if (result.success) {
          setSettings(result.settings);
          
          // Apply theme
          document.documentElement.dataset.theme = result.settings.theme;
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    // Load initial data
    fetchModels();
    loadSettings();
    loadConversationHistory();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up periodic login check
    const loginCheckInterval = setInterval(() => {
      ipcRenderer.invoke('check-login-status')
        .then(result => {
          if (result.success) {
            updateModelLoginStatus(result.status);
          }
        })
        .catch(err => console.error('Login check failed:', err));
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Cleanup
    return () => {
      removeEventListeners();
      clearInterval(loginCheckInterval);
    };
  }, []);
  
  const setupEventListeners = () => {
    // Response streaming updates
    ipcRenderer.on('response-update', (_event: any, newResponses: Record<string, Response>) => {
      setResponses(prev => ({ ...prev, ...newResponses }));
    });
    
    // Response completion
    ipcRenderer.on('response-complete', (_event: any, modelId: string, response: Response) => {
      setResponses(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          ...response,
          isComplete: true
        }
      }));
      
      // Update loading state if all responses are complete
      checkAllResponsesComplete();
    });
    
    // Response errors
    ipcRenderer.on('response-error', (_event: any, modelId: string, error: any) => {
      console.error(`Error from ${modelId}:`, error);
      setResponses(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          content: `Error: ${error.message}`,
          isComplete: true,
          error: true
        }
      }));
      
      // Update loading state if all responses are complete
      checkAllResponsesComplete();
    });
    
    // UI events from menu
    ipcRenderer.on('show-settings', () => setShowSettings(true));
    ipcRenderer.on('new-conversation', () => {
      clearConversation();
      if (promptInputRef.current) {
        promptInputRef.current.focus();
      }
    });
    ipcRenderer.on('export-to-obsidian', () => handleExportToObsidian());
  };
  
  const removeEventListeners = () => {
    ipcRenderer.removeAllListeners('response-update');
    ipcRenderer.removeAllListeners('response-complete');
    ipcRenderer.removeAllListeners('response-error');
    ipcRenderer.removeAllListeners('show-settings');
    ipcRenderer.removeAllListeners('new-conversation');
    ipcRenderer.removeAllListeners('export-to-obsidian');
  };
  
  // Check if all responses are complete and update loading state
  const checkAllResponsesComplete = () => {
    const allComplete = Object.values(responses).every(response => response.isComplete);
    if (allComplete && isLoading) {
      setIsLoading(false);
      
      // Save to history if we have responses
      if (Object.keys(responses).length > 0) {
        saveConversationToHistory();
      }
    }
  };
  
  // Update model login status from backend
  const updateModelLoginStatus = (statusMap: Record<string, boolean>) => {
    setAvailableModels(prev => 
      prev.map(model => ({
        ...model,
        isLoggedIn: statusMap[model.id] ?? model.isLoggedIn
      }))
    );
  };
  
  // Load conversation history
  const loadConversationHistory = async () => {
    try {
      const result = await ipcRenderer.invoke('get-conversations');
      if (result.success) {
        setHistory(result.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };
  
  // Save current conversation to history
  const saveConversationToHistory = async () => {
    if (!currentPrompt || Object.keys(responses).length === 0) return;
    
    try {
      await ipcRenderer.invoke('add-conversation', currentPrompt, responses);
      loadConversationHistory(); // Refresh history
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };-conversation', handleNewConversation);
    ipcRenderer.on('export-to-obsidian', () => handleExportToObsidian());
  };
  
  const removeEventListeners = () => {
    ipcRenderer.removeAllListeners('response-update');
    ipcRenderer.removeAllListeners('response-complete');
    ipcRenderer.removeAllListeners('response-error');
    ipcRenderer.removeAllListeners('show-settings');
    ipcRenderer.removeAllListeners('new-conversation');
    ipcRenderer.removeAllListeners('export-to-obsidian');
  };
  
  const updateModelLoginStatus = (statusMap: Record<string, boolean>) => {
    setAvailableModels(prev => 
      prev.map(model => ({
        ...model,
        isLoggedIn: statusMap[model.id] ?? model.isLoggedIn
      }))
    );
  };
  
  const checkAllResponsesComplete = () => {
    // Check if all selected models have completed responses
    const allComplete = selectedModels.every(modelId => 
      responses[modelId]?.isComplete === true
    );
    
    if (allComplete && isLoading) {
      setIsLoading(false);
      
      // If auto-export is enabled, export to Obsidian
      if (settings.autoExportToObsidian) {
        handleExportToObsidian();
      }
      
      // Save conversation to history
      saveCurrentConversation();
    }
  };
  
  const loadConversationHistory = async () => {
    try {
      const result = await ipcRenderer.invoke('get-conversations', 50, 0);
      if (result.success) {
        setHistory(result.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };
  
  const saveCurrentConversation = async () => {
    if (!currentPrompt || Object.keys(responses).length === 0) return;
    
    try {
      await ipcRenderer.invoke('add-conversation', currentPrompt, responses);
      loadConversationHistory(); // Refresh history
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };
  
  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };
  
  const handleSendPrompt = async (prompt: string) => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    
    // Check if selected models are logged in
    const notLoggedInModels = selectedModels.filter(
      id => !availableModels.find(model => model.id === id)?.isLoggedIn
    );
    
    if (notLoggedInModels.length > 0) {
      setErrorMessage(`Please log in to the following models: ${notLoggedInModels.map(id => 
        availableModels.find(model => model.id === id)?.name
      ).join(', ')}`);
      return;
    }
    
    setIsLoading(true);
    setCurrentPrompt(prompt);
    setErrorMessage(null);
    
    // Clear previous responses
    setResponses({});
    
    try {
      await ipcRenderer.invoke('send-prompt', prompt, selectedModels);
    } catch (error) {
      console.error('Failed to send prompt:', error);
      setErrorMessage('Failed to send prompt. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handleStopGeneration = async () => {
    try {
      await ipcRenderer.invoke('stop-generation');
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to stop generation:', error);
    }
  };
  
  const handleLoginRequest = async (modelId: string) => {
    setLoginModelId(modelId);
    setErrorMessage(null);
    
    try {
      const result = await ipcRenderer.invoke('login-to-model', modelId);
      
      if (result.success) {
        // Update model's login status
        setAvailableModels(prev => 
          prev.map(model => 
            model.id === modelId 
              ? { ...model, isLoggedIn: true } 
              : model
          )
        );
      } else {
        setErrorMessage(`Failed to login to ${availableModels.find(m => m.id === modelId)?.name}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Failed to login to ${modelId}:`, error);
      setErrorMessage(`Failed to login to ${availableModels.find(m => m.id === modelId)?.name}. Please try again.`);
    } finally {
      setLoginModelId(null);
    }
  };
  
  const handleCancelLogin = async () => {
    if (loginModelId) {
      await ipcRenderer.invoke('cancel-login', loginModelId);
      setLoginModelId(null);
    }
  };
  
  const handleExportToObsidian = async (conversationId: string | null = null) => {
    try {
      const result = await ipcRenderer.invoke('export-to-obsidian', conversationId);
      
      if (result.success) {
        // Show success message
        setErrorMessage(null);
        // If we exported a history item, refresh history
        if (conversationId) {
          loadConversationHistory();
        }
      } else {
        setErrorMessage(`Failed to export to Obsidian: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to export to Obsidian:', error);
      setErrorMessage('Failed to export to Obsidian. See console for details.');
    }
  };
  
  const handleSetObsidianVault = async () => {
    try {
      const result = await ipcRenderer.invoke('set-obsidian-vault');
      
      if (result.success) {
        // Update settings
        setSettings(prev => ({
          ...prev,
          obsidianVaultPath: result.vaultPath
        }));
        setErrorMessage(null);
      } else {
        setErrorMessage(`Failed to set Obsidian vault: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to set Obsidian vault:', error);
      setErrorMessage('Failed to set Obsidian vault. See console for details.');
    }
  };
  
  const handleHistoryItemSelect = async (conversationId: string) => {
    try {
      const result = await ipcRenderer.invoke('get-conversation', conversationId);
      if (result.success) {
        setSelectedConversation(conversationId);
        setCurrentPrompt(result.conversation.prompt);
        setResponses(result.conversation.responses);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setErrorMessage('Failed to load conversation. Please try again.');
    }
  };
  
  const handleHistoryItemDelete = async (conversationId: string) => {
    try {
      const result = await ipcRenderer.invoke('delete-conversation', conversationId);
      if (result.success) {
        loadConversationHistory();
        if (selectedConversation === conversationId) {
          setSelectedConversation(null);
          handleNewConversation();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setErrorMessage('Failed to delete conversation. Please try again.');
    }
  };
  
  const handleNewConversation = () => {
    setSelectedConversation(null);
    setCurrentPrompt('');
    setResponses({});
    setErrorMessage(null);
    if (promptInputRef.current) {
      promptInputRef.current.focus();
    }
  };
  
  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      const result = await ipcRenderer.invoke('save-app-settings', newSettings);
      if (result.success) {
        setSettings(newSettings);
        document.documentElement.dataset.theme = newSettings.theme;
        setShowSettings(false);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setErrorMessage('Failed to save settings. Please try again.');
    }
  };
  
  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all conversation history? This cannot be undone.')) {
      try {
        const result = await ipcRenderer.invoke('clear-all-conversations');
        if (result.success) {
          loadConversationHistory();
          handleNewConversation();
        }
      } catch (error) {
        console.error('Failed to clear history:', error);
        setErrorMessage('Failed to clear history. Please try again.');
      }
    }
  };
  
  return (
    <div className={`multi-ai-app ${settings.theme}`}>
      {/* Error notification */}
      {errorMessage && (
        <div className="error-notification">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}
      
      <div className="app-header">
        <h1>Aegntic Desktop</h1>
        <div className="header-actions">
          <button 
            className={`${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            History
          </button>
          <button 
            className={`${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            Settings
          </button>
        </div>
      </div>
      
      <div className="app-content">
        <div className="app-sidebar">
          <ModelSelector
            models={availableModels}
            selectedModels={selectedModels}
            onToggleModel={handleModelToggle}
            onLoginRequest={handleLoginRequest}
            currentLoginModel={loginModelId}
            onCancelLogin={handleCancelLogin}
          />
          
          <div className="vault-settings">
            <button onClick={handleSetObsidianVault}>
              {settings.obsidianVaultPath ? 'Change Obsidian Vault' : 'Set Obsidian Vault'}
            </button>
            {settings.obsidianVaultPath && (
              <div className="vault-path">
                Current vault: {path.basename(settings.obsidianVaultPath)}
              </div>
            )}
          </div>
        </div>
        
        <div className="app-main">
          <PromptInput 
            ref={promptInputRef}
            value={currentPrompt}
            onSendPrompt={handleSendPrompt}
            isLoading={isLoading}
            onStopGeneration={handleStopGeneration}
          />
          
          <ResponseView 
            responses={responses}
            isLoading={isLoading}
            selectedModels={selectedModels}
            onExportToObsidian={() => handleExportToObsidian()}
            viewMode={settings.responseViewMode}
          />
        </div>
        
        {showHistory && (
          <HistoryPanel 
            conversations={history}
            selectedConversationId={selectedConversation}
            onSelectConversation={handleHistoryItemSelect}
            onDeleteConversation={handleHistoryItemDelete}
            onNewConversation={handleNewConversation}
            onClearHistory={handleClearHistory}
            onClose={() => setShowHistory(false)}
            onExportToObsidian={handleExportToObsidian}
          />
        )}
        
        {showSettings && (
          <SettingsPanel 
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onCancel={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
};

export default MultiAIApp;