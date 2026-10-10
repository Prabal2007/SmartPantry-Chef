import React, { useState } from 'react';
import { Settings, X, Key, Sparkles, Check, ExternalLink, ShieldCheck } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey
}) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveApiKey(inputKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 border border-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Model Settings</h3>
              <p className="text-xs text-slate-500">Configure Google Gemini LLM key (Optional)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Dynamic Fallback Engine Included!
            </div>
            <p className="text-emerald-700 leading-relaxed">
              SmartPantry Chef works 100% out of the box with built-in intelligent recipe synthesis! Providing a Gemini API Key enables live Google Gemini LLM generation.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Key className="w-3.5 h-3.5 text-slate-400" /> Google Gemini API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              Don't have a key? Get a free API key from{' '}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 underline hover:text-emerald-800 font-semibold inline-flex items-center gap-0.5"
              >
                Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setInputKey('');
                onSaveApiKey('');
              }}
              className="px-4 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
            >
              Remove Key
            </button>

            <button
              type="submit"
              className="flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" /> Settings Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
