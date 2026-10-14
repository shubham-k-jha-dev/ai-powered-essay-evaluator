import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, Upload, FileText, Type, AlignLeft,
  BookOpen, Clock
} from 'lucide-react';
import { evaluateEssay, getPromptOptions, predictNextWord } from '../api';
import { SAMPLE_ESSAY, SAMPLE_ESSAY_PROMPT, SAMPLE_ESSAY_TITLE } from '../sampleEssay';
import type { EvaluationResult } from '../api';
import type { ToastMessage } from '../App';

interface WritePageProps {
  title: string;
  text: string;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
  onEvaluationComplete: (result: EvaluationResult) => void;
  showToast: (text: string, type?: ToastMessage['type']) => void;
}

export function WritePage({
  title, text, onTitleChange, onTextChange,
  onEvaluationComplete, showToast,
}: WritePageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [promptOptions, setPromptOptions] = useState<string[]>([]);
  const [promptName, setPromptName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    getPromptOptions().then(setPromptOptions);
  }, []);

  // Word/char/sentence counts
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const wordCount = words.length;
  const charCount = text.length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Fetch next-word suggestions
  const fetchSuggestions = useCallback(async (currentText: string) => {
    if (currentText.trim().length < 5) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const preds = await predictNextWord(currentText);
      if (preds.length > 0) {
        setSuggestions(preds);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } catch {
      setShowSuggestions(false);
    }
  }, []);

  // Debounced suggestion fetching on text change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, fetchSuggestions]);

  const handleSuggestionClick = (word: string) => {
    const needsSpace = text.length > 0 && !text.endsWith(' ');
    const newText = text + (needsSpace ? ' ' : '') + word;
    onTextChange(newText);
    textareaRef.current?.focus();
    setShowSuggestions(false);
  };

  const handleEvaluate = async () => {
    if (wordCount < 10) {
      showToast('Please write at least 10 words before evaluating.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const result = await evaluateEssay(text, title || 'Untitled Essay', promptName);
      onEvaluationComplete(result);
      showToast('Essay evaluated successfully!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(
        `We couldn't analyze the essay right now. ${message}`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleEssay = () => {
    onTitleChange(SAMPLE_ESSAY_TITLE);
    onTextChange(SAMPLE_ESSAY);
    setPromptName(SAMPLE_ESSAY_PROMPT);
    showToast('Sample essay loaded', 'success');
    textareaRef.current?.focus();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        onTextChange(content);
        onTitleChange(file.name.replace('.txt', ''));
        showToast('File uploaded successfully', 'success');
      };
      reader.readAsText(file);
    } else {
      showToast('Please upload a .txt file', 'error');
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <>
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">Analyzing your essay...</div>
          <div className="loading-subtext">
            Running NLP feature extraction and ML model prediction
          </div>
        </div>
      )}

      <div className="workspace">
        <input
          className="title-input"
          type="text"
          placeholder="Untitled Essay"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />

        <label className="prompt-field">
          <span>Essay prompt</span>
          <select
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            disabled={promptOptions.length === 0}
            required
          >
            <option value="">
              {promptOptions.length ? 'Select the closest topic' : 'Prompts unavailable; check the backend'}
            </option>
            {promptOptions.map((prompt) => (
              <option key={prompt} value={prompt}>{prompt}</option>
            ))}
          </select>
        </label>

        <div className="editor-toolbar">
          <div className="toolbar-left">
            <button className="toolbar-btn" title="Bold">
              <strong>B</strong>
            </button>
            <button className="toolbar-btn" title="Italic">
              <em>I</em>
            </button>
            <div className="toolbar-divider" />
            <button className="toolbar-btn" title="Heading">
              <Type size={14} />
            </button>
            <button className="toolbar-btn" title="Paragraph">
              <AlignLeft size={14} />
            </button>
          </div>
          <div className="toolbar-right">
            <div className="upload-zone">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                className="upload-input"
                onChange={handleFileUpload}
              />
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={13} />
                Upload
              </button>
            </div>
            <button
              className="btn btn-sm btn-ghost"
              onClick={handleSampleEssay}
            >
              <FileText size={13} />
              Try Sample Essay
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="essay-textarea"
          placeholder="Start writing your essay..."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          spellCheck
        />

        <div className={`suggestions-bar ${showSuggestions && suggestions.length > 0 ? 'visible' : ''}`}>
          <span className="suggestions-label">
            <Sparkles size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Suggested
          </span>
          {suggestions.map((word, i) => (
            <button
              key={`${word}-${i}`}
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(word)}
            >
              {word}
            </button>
          ))}
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <Type size={13} />
            <span className="stat-value">{wordCount}</span> words
          </div>
          <div className="stat-item">
            <AlignLeft size={13} />
            <span className="stat-value">{charCount}</span> characters
          </div>
          <div className="stat-item">
            <BookOpen size={13} />
            <span className="stat-value">{sentenceCount}</span> sentences
          </div>
          <div className="stat-item">
            <Clock size={13} />
            <span className="stat-value">{readingTime}</span> min read
          </div>
        </div>

        <div className="action-bar">
          <div className="action-left">
            <button
              className="btn btn-primary"
              onClick={handleEvaluate}
              disabled={isLoading || wordCount < 10 || !promptName}
            >
              <Sparkles size={16} />
              Evaluate Essay
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
