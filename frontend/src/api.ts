const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

export interface ModelInfo {
  loaded: boolean;
  name?: string;
  version?: string;
  trained_on?: string;
  test_essays?: number;
  qwk?: number;
  mae?: number;
  rmse?: number;
  within_one?: number;
}

export interface Statistics {
  word_count: number;
  character_count: number;
  sentence_count: number;
  paragraph_count: number;
  avg_sentence_length: number;
  sentence_length_std: number;
  avg_word_length: number;
  unique_words: number;
  type_token_ratio: number;
  long_word_ratio: number;
  transition_words_per_100: number;
  flesch_reading_ease: number;
  flesch_kincaid_grade: number;
  reading_time_min: number;
}

export interface EvaluationResult {
  score: number;
  rounded_score: number;
  label: string;
  scale: { min: number; max: number; levels: { score: number; label: string }[] };
  model_breakdown: { score: number; ridge: number; gradient_boosting: number };
  model: ModelInfo;
  statistics: Statistics;
  topic: { provided: boolean; keyword_overlap: number | null };
  mechanics_checks: { type: string; message: string }[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  elapsed_ms: number;
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return `Server error (${res.status})`;
}

export async function evaluateEssay(essay: string, topic: string): Promise<EvaluationResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essay, topic: topic.trim() || null }),
    });
  } catch {
    throw new Error('Cannot reach the backend. Is the FastAPI server running on port 8000?');
  }
  if ([502, 503, 504].includes(res.status) && !res.headers.get('content-type')?.includes('json')) {
    throw new Error('Cannot reach the backend. Is the FastAPI server running on port 8000?');
  }
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function getModelInfo(): Promise<ModelInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/model`);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}
