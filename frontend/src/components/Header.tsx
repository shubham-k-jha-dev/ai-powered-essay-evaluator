import { PenLine, Plus, Settings } from 'lucide-react';
import type { Page } from '../App';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onNewEssay: () => void;
}

export function Header({ currentPage, onNavigate, onNewEssay }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo" onClick={() => onNavigate('write')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <PenLine size={15} />
          </div>
          EssayAI
        </div>
        <nav className="nav">
          <button
            className={`nav-link ${currentPage === 'write' ? 'active' : ''}`}
            onClick={() => onNavigate('write')}
          >
            Write
          </button>
          <button
            className={`nav-link ${currentPage === 'results' ? 'active' : ''}`}
            onClick={() => onNavigate('results')}
          >
            Evaluate
          </button>
          <button
            className={`nav-link ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => onNavigate('history')}
          >
            History
          </button>
          <button
            className={`nav-link ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => onNavigate('about')}
          >
            About
          </button>
        </nav>
      </div>
      <div className="header-right">
        <button className="btn-new-essay" onClick={onNewEssay}>
          <Plus size={15} />
          New Essay
        </button>
        <button className="btn-icon" title="Settings">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
