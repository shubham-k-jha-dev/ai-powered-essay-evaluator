import { useState, useEffect } from 'react';
import { FileText, Trash2, PenLine } from 'lucide-react';
import { getHistory, deleteHistoryEntry } from '../api';
import type { HistoryEntry } from '../api';
import type { Page, ToastMessage } from '../App';

interface HistoryPageProps {
  onNavigate: (page: Page) => void;
  showToast: (text: string, type?: ToastMessage['type']) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#29a376';
  if (score >= 60) return '#5746af';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

export function HistoryPage({ onNavigate, showToast }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory();
      setHistory(data);
    } catch {
      showToast('Could not load history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteHistoryEntry(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      showToast('Entry deleted', 'success');
    } catch {
      showToast('Could not delete entry', 'error');
    }
  };

  return (
    <div className="history-page">
      <h1 className="history-title">Evaluation History</h1>
      <p className="history-subtitle">
        View your previous essay evaluations and track your writing progress.
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="loading-spinner" />
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText size={28} />
          </div>
          <h3 className="empty-state-title">No essays evaluated yet</h3>
          <p className="empty-state-description">
            Write your first essay and let EssayAI analyze it to see your results here.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('write')}>
            <PenLine size={16} />
            Start Writing
          </button>
        </div>
      ) : (
        <div className="history-list">
          {history.map((entry) => (
            <div className="history-item" key={entry.id}>
              <div className="history-item-left">
                <div className="history-item-title">{entry.title}</div>
                <div className="history-item-meta">
                  <span>{formatDate(entry.timestamp)}</span>
                  <span>{entry.word_count} words</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span
                  className="history-item-score"
                  style={{ color: getScoreColor(entry.overall_score) }}
                >
                  {entry.overall_score}/100
                </span>
                <button
                  className="btn-icon"
                  onClick={(e) => handleDelete(entry.id, e)}
                  title="Delete"
                  style={{ width: 30, height: 30 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
