import React, { useState } from 'react';

interface PromptInputProps {
  onSendPrompt: (prompt: string) => void;
  isLoading: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSendPrompt, isLoading }) => {
  const [prompt, setPrompt] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    
    onSendPrompt(prompt);
    // Don't reset the prompt text here, in case the user wants to modify and resend
  };

  return (
    <div className="prompt-input-container">
      <form onSubmit={handleSubmit}>
        <textarea
          className="prompt-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          rows={4}
          disabled={isLoading}
        />
        <div className="prompt-actions">
          <button
            type="button"
            className="clear-button"
            onClick={() => setPrompt('')}
            disabled={isLoading || !prompt}
          >
            Clear
          </button>
          <button
            type="submit"
            className="send-button"
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? 'Sending...' : 'Send Prompt'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromptInput;
