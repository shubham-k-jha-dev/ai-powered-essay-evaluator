import {
  ArrowLeft, CheckCircle2, AlertTriangle, Lightbulb,
  BarChart3, Type, BookOpen, AlignLeft, Hash, Percent, GraduationCap,
  Clock
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer
} from 'recharts';
import { ScoreRing } from '../components/ScoreRing';
import type { EvaluationResult } from '../api';

interface ResultsPageProps {
  result: EvaluationResult;
  essayTitle: string;
  onBack: () => void;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Above Average';
  if (score >= 50) return 'Average';
  if (score >= 40) return 'Below Average';
  return 'Needs Improvement';
}

function getScoreDescription(score: number): string {
  if (score >= 80) return 'Your essay demonstrates strong writing skills with good structure, vocabulary, and relevance to the topic.';
  if (score >= 60) return 'Your essay shows solid fundamentals with some areas that could be strengthened for greater impact.';
  if (score >= 40) return 'Your essay communicates ideas but would benefit from improvements in structure, vocabulary, and coherence.';
  return 'Your essay needs significant improvement across multiple dimensions. Focus on the recommendations below.';
}

function getDimensionColor(score: number): string {
  if (score >= 80) return '#29a376';
  if (score >= 60) return '#5746af';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

const DIMENSION_LABELS: Record<string, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  coherence: 'Coherence',
  relevance: 'Relevance',
  sentence_structure: 'Sentence Structure',
  readability: 'Readability',
};

export function ResultsPage({ result, essayTitle, onBack }: ResultsPageProps) {
  const radarData = Object.entries(result.dimensions).map(([key, value]) => ({
    dimension: DIMENSION_LABELS[key] || key,
    score: value,
    fullMark: 100,
  }));

  const stats = result.statistics;

  return (
    <div className="results-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} />
        Back to editor
      </button>

      <div className="results-header">
        <div>
          <h1 className="results-title">Essay Evaluation</h1>
          <p className="results-subtitle">{essayTitle || 'Untitled Essay'}</p>
        </div>
        <div className="results-meta">
          <span className={`model-badge ${result.model_available ? '' : 'fallback'}`}>
            {result.model_available ? '● ML Model' : '● Heuristic Fallback'}
          </span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="score-section">
        <ScoreRing score={result.overall_score} />
        <div className="score-details">
          <div className="score-label">{getScoreLabel(result.overall_score)}</div>
          <p className="score-description">{getScoreDescription(result.overall_score)}</p>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="dimensions-grid">
        {Object.entries(result.dimensions).map(([key, value]) => (
          <div className="dimension-card" key={key}>
            <div className="dimension-header">
              <span className="dimension-name">{DIMENSION_LABELS[key] || key}</span>
              <span
                className="dimension-score"
                style={{ color: getDimensionColor(value) }}
              >
                {value}
              </span>
            </div>
            <div className="dimension-bar">
              <div
                className="dimension-bar-fill"
                style={{
                  width: `${value}%`,
                  background: getDimensionColor(value),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-value">{stats.word_count}</div>
          <div className="stat-card-label">
            <Type size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Words
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.sentence_count}</div>
          <div className="stat-card-label">
            <AlignLeft size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Sentences
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.avg_sentence_length}</div>
          <div className="stat-card-label">
            <Hash size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Avg. sentence length
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.unique_words}</div>
          <div className="stat-card-label">
            <BookOpen size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Unique words
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.vocabulary_diversity}%</div>
          <div className="stat-card-label">
            <Percent size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Vocabulary diversity
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">Grade {stats.readability_grade}</div>
          <div className="stat-card-label">
            <GraduationCap size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Readability level
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.paragraph_count}</div>
          <div className="stat-card-label">Paragraphs</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.character_count.toLocaleString()}</div>
          <div className="stat-card-label">Characters</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.reading_time} min</div>
          <div className="stat-card-label">
            <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Reading time
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="chart-container">
        <h3 className="chart-title">
          <BarChart3 size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Score Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e3e4e8" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#5e6068', fontSize: 12.5 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#8b8d95', fontSize: 11 }}
              tickCount={5}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#5746af"
              fill="#5746af"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Strengths & Improvements side by side */}
      <div className="two-col">
        <div className="section-card">
          <h3 className="section-title">
            <CheckCircle2 size={18} color="#29a376" />
            What's Working
          </h3>
          {result.strengths.map((s, i) => (
            <div className="strength-item" key={i}>
              <div className="strength-icon">✓</div>
              <div>
                <div className="strength-title">{s.title}</div>
                <div className="strength-detail">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="section-card">
          <h3 className="section-title">
            <AlertTriangle size={18} color="#d97706" />
            Areas to Improve
          </h3>
          {result.improvements.length > 0 ? (
            result.improvements.map((imp, i) => (
              <div className="improvement-item" key={i}>
                <div className="improvement-icon">!</div>
                <div>
                  <div className="improvement-title">{imp.title}</div>
                  <div className="improvement-detail">{imp.detail}</div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', padding: '12px 0' }}>
              Great job! No major areas for improvement identified.
            </p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="section-card">
        <h3 className="section-title">
          <Lightbulb size={18} color="#5746af" />
          AI Recommendations
        </h3>
        {result.recommendations.map((rec, i) => (
          <div className="recommendation-item" key={i}>
            <div className="recommendation-number">{i + 1}</div>
            <div>
              <div className="recommendation-title">{rec.title}</div>
              <div className="recommendation-detail">{rec.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
