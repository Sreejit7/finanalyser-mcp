import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnalysisResults, ModelsResponse } from '../types';

interface ConfigurationPanelProps {
  selectedFile: File | null;
  loading: boolean;
  onAnalyze: (results: AnalysisResults) => void;
  onLoading: (loading: boolean) => void;
  onShowError: (message: string) => void;
  onShowSuccess: (message: string) => void;
  onClearMessages: () => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  selectedFile,
  loading,
  onAnalyze,
  onLoading,
  onShowError,
  onShowSuccess,
  onClearMessages,
}) => {
  const [modelName, setModelName] = useState('google/gemini-2.5-flash-lite-preview-06-17');
  const [provider, setProvider] = useState('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState<ModelsResponse['models']>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      setModelsLoading(true);
      const response = await axios.get<ModelsResponse>('/api/models');
      setAvailableModels(response.data.models || []);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      // Set default models if API fails
      setAvailableModels([
        { name: 'google/gemini-2.5-flash-lite-preview-06-17', provider: 'openrouter', cost: '$0.075/1M tokens' },
        { name: 'openai/gpt-4o-mini', provider: 'openrouter', cost: '$0.15/1M tokens' },
        { name: 'anthropic/claude-3-haiku', provider: 'openrouter', cost: '$0.25/1M tokens' },
        { name: 'anthropic/claude-3-5-sonnet', provider: 'openrouter', cost: '$3/1M tokens' },
        { name: 'openai/gpt-4-turbo', provider: 'openrouter', cost: '$10/1M tokens' }
      ]);
    } finally {
      setModelsLoading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      onShowError('Please select a file first');
      return;
    }

    onLoading(true);
    onClearMessages();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('llm_provider', provider);
      formData.append('model_name', modelName);
      
      if (apiKey.trim()) {
        formData.append('api_key', apiKey.trim());
      }

      const response = await axios.post<AnalysisResults>('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutes timeout
      });

      onAnalyze(response.data);
      onShowSuccess('Analysis completed successfully!');
      
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Analysis failed';
      onShowError(`Analysis failed: ${message}`);
      console.error('Analysis error:', error);
    } finally {
      onLoading(false);
    }
  };

  const selectedModel = availableModels?.find(m => m.name === modelName);

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 animate-fade-in-right">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">AI Configuration</h2>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            AI Model
          </label>
          <select
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            disabled={modelsLoading}
            className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 text-gray-800 font-medium disabled:opacity-50"
          >
            {modelsLoading ? (
              <option>Loading models...</option>
            ) : (
              availableModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name.split('/')[1]} ({model.cost})
                </option>
              ))
            )}
          </select>
          {selectedModel && (
            <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Provider:</span> {selectedModel.provider} • 
                <span className="font-semibold"> Cost:</span> {selectedModel.cost}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 text-gray-800 font-medium"
          >
            <option value="openrouter">OpenRouter (Recommended)</option>
            <option value="openai">OpenAI Direct</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            API Key (Optional)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key or leave empty for default"
            className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 text-gray-800"
          />
          <div className="mt-2 text-xs text-gray-500">
            Leave empty to use our default API key, or provide your own for higher rate limits
          </div>
        </div>

        <button
          type="submit"
          disabled={!selectedFile || loading}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform ${
            selectedFile && !loading
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing with AI...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyze with AI
              </>
            )}
          </div>
        </button>
      </form>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-emerald-700">Smart Categorization</span>
          </div>
          <div className="text-xs text-emerald-600">
            AI automatically categorizes your transactions with high accuracy
          </div>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-blue-700">Batch Processing</span>
          </div>
          <div className="text-xs text-blue-600">
            Efficiently processes large datasets in optimized batches
          </div>
        </div>
      </div>
    </div>
  );
};