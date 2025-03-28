import React, { useState, useEffect } from 'react';

interface Response {
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
}

interface ResponseViewProps {
  responses: Record<string, Response>;
  isLoading: boolean;
  selectedModels: string[];
  onExportToObsidian: () => void;
}

const ResponseView: React.FC<ResponseViewProps> = ({ 
  responses, 
  isLoading, 
  selectedModels,
  onExportToObsidian
}) => {
  const [viewMode, setViewMode] = useState<'tabs' | 'split'>('tabs');
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Set active tab when responses change
  useEffect(() => {
    const responseIds = Object.keys(responses);
    if (responseIds.length > 0 && (!activeTab || !responseIds.includes(activeTab))) {
      setActiveTab(responseIds[0]);
    }
  }, [responses, activeTab]);

  const renderTabs = () => {
    return (
      <div className="tabs-response-view">
        <div className="tabs-header">
          {Object.values(responses).map(response => (
            <div
              key={response.modelId}
              className={`tab ${activeTab === response.modelId ? 'active' : ''}`}
              onClick={() => setActiveTab(response.modelId)}
            >
              {response.modelName}
            </div>
          ))}
        </div>
        <div className="tab-content">
          {activeTab && responses[activeTab] ? (
            <div className="response-content">
              {responses[activeTab].content}
            </div>
          ) : (
            <div className="no-response">
              No response selected
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSplit = () => {
    return (
      <div className="split-response-view">
        {Object.values(responses).length > 0 ? (
          <div className="split-grid" style={{ 
            gridTemplateColumns: `repeat(${Object.values(responses).length}, 1fr)` 
          }}>
            {Object.values(responses).map(response => (
              <div key={response.modelId} className="split-item">
                <div className="split-header">{response.modelName}</div>
                <div className="split-content">{response.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-responses">
            No responses yet
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="response-view-container">
      <div className="response-view-header">
        <div className="view-mode-selector">
          <button
            className={`view-mode-button ${viewMode === 'tabs' ? 'active' : ''}`}
            onClick={() => setViewMode('tabs')}
          >
            Tabs
          </button>
          <button
            className={`view-mode-button ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            Split View
          </button>
        </div>
      </div>
      
      <div className="response-view-content">
        {isLoading ? (
          <div className="loading-state">
            {selectedModels.length > 0 ? (
              <div>
                <div className="loading-spinner"></div>
                <div>Waiting for responses from {selectedModels.length} model(s)...</div>
              </div>
            ) : (
              <div>Please select at least one AI model</div>
            )}
          </div>
        ) : Object.keys(responses).length > 0 ? (
          viewMode === 'tabs' ? renderTabs() : renderSplit()
        ) : (
          <div className="empty-state">
            <p>No responses yet. Select AI models and send a prompt to see responses here.</p>
          </div>
        )}
      </div>

      <div className="response-view-actions">
        <button 
          className="export-button" 
          disabled={Object.keys(responses).length === 0 || isLoading}
          onClick={onExportToObsidian}
        >
          Export to Obsidian
        </button>
      </div>
    </div>
  );
};

export default ResponseView;
