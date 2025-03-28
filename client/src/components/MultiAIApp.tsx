import React, { useState, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import PromptInput from './PromptInput';
import ResponseView from './ResponseView';

// Use a type assertion for Electron's IPC renderer
const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

interface AIModel {
  id: string;
  name: string;
  isLoggedIn: boolean;
}

interface Response {
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
}

const MultiAIApp: React.FC = () => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [loginModelId, setLoginModelId] = useState<string | null>(null);
  
  useEffect(() => {
    // Initialize available models
    const fetchModels = async () => {
      try {
        const models = await ipcRenderer.invoke('get-available-models');
        setAvailableModels(models);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    
    fetchModels();
    
    // Set up listener for responses
    const responseUpdateListener = (_event: any, newResponses: Record<string, Response>) => {
      setResponses(prev => ({ ...prev, ...newResponses }));
      setIsLoading(false);
    };
    
    ipcRenderer.on('response-update', responseUpdateListener);
    
    return () => {
      ipcRenderer.removeListener('response-update', responseUpdateListener);
    };
  }, []);
  
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
      alert(`Please log in to the following models: ${notLoggedInModels.map(id => 
        availableModels.find(model => model.id === id)?.name
      ).join(', ')}`);
      return;
    }
    
    setIsLoading(true);
    setCurrentPrompt(prompt);
    
    // Clear previous responses
    setResponses({});
    
    try {
      await ipcRenderer.invoke('send-prompt', prompt, selectedModels);
    } catch (error) {
      console.error('Failed to send prompt:', error);
      setIsLoading(false);
    }
  };
  
  const handleLoginRequest = async (modelId: string) => {
    setLoginModelId(modelId);
    
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
      }
    } catch (error) {
      console.error(`Failed to login to ${modelId}:`, error);
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
  
  const handleExportToObsidian = async () => {
    try {
      const result = await ipcRenderer.invoke('export-to-obsidian', currentPrompt);
      
      if (result.success) {
        alert(`Successfully exported to Obsidian: ${result.filePath}`);
      } else {
        alert(`Failed to export: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to export to Obsidian:', error);
      alert('Failed to export to Obsidian. See console for details.');
    }
  };
  
  const handleSetObsidianVault = async () => {
    try {
      const result = await ipcRenderer.invoke('set-obsidian-vault');
      
      if (result.success) {
        alert(`Obsidian vault set to: ${result.vaultPath}\nMindmaps will be stored in: ${result.folderPath}`);
      } else {
        alert(`Failed to set Obsidian vault: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to set Obsidian vault:', error);
      alert('Failed to set Obsidian vault. See console for details.');
    }
  };
  
  return (
    <div className="multi-ai-app">
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
            Set Obsidian Vault
          </button>
        </div>
      </div>
      
      <div className="app-main">
        <PromptInput 
          onSendPrompt={handleSendPrompt}
          isLoading={isLoading}
        />
        
        <ResponseView 
          responses={responses}
          isLoading={isLoading}
          selectedModels={selectedModels}
          onExportToObsidian={handleExportToObsidian}
        />
      </div>
    </div>
  );
};

export default MultiAIApp;
