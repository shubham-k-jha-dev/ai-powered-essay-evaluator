import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, BookOpen, CheckCircle2, ClipboardList, FileText, GraduationCap,
  History, Lightbulb, Loader2, RotateCcw, Sparkles, TriangleAlert, Wand2,
} from 'lucide-react';
import { evaluateEssay, getModelInfo, type EvaluationResult, type ModelInfo } from './api';
import { SAMPLES } from './sampleEssay';

const MIN_WORDS = 30;

interface HistoryItem {
  id: number;
  preview: string;
  topic: string;
  text: string;
  result: EvaluationResult;
  time: string;
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function App() {
  const [essay, setEssay] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [evaluatedText, setEvaluatedText] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null | undefined>(undefined);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getModelInfo().then(setModelInfo);
  }, []);

  const words = countWords(essay);
  const sentences = essay.split(/[.!?]+/).filter(s => s.trim()).length;
  const stale = result !== null && evaluatedText !== essay;

  async function handleEvaluate() {
    if (words < MIN_WORDS || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await evaluateEssay(essay, topic);
      setResult(r);
      setEvaluatedText(essay);
      setHistory(h => [
        { id: Date.now(), preview: essay.trim().slice(0, 70), topic, text: essay, result: r,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ...h,
      ].slice(0, 8));
      if (!modelInfo?.loaded) getModelInfo().then(setModelInfo);
      requestAnimationFrame(() => {
        if (window.innerWidth < 1024) resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
      getModelInfo().then(setModelInfo);
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setEssay('');
    setTopic('');
    setResult(null);
    setError(null);
    setEvaluatedText('');
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900 sm:text-lg">AI Essay Evaluator</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Automated essay scoring trained on ASAP 2.0</p>
            </div>
          </div>
          <ModelBadge info={modelInfo} />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ── Editor ─────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label htmlFor="topic" className="text-sm font-medium text-slate-700">
              Essay topic or assignment prompt <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="topic"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Should schools adopt a four-day week?"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            <div className="mt-4 flex items-center justify-between">
              <label htmlFor="essay" className="text-sm font-medium text-slate-700">Your essay</label>
              <select
                aria-label="Load a sample essay"
                value=""
                onChange={e => {
                  const smp = SAMPLES[Number(e.target.value)];
                  if (smp) { setEssay(smp.text); setTopic(smp.topic); setError(null); }
                }}
                className="max-w-[60%] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none transition hover:border-indigo-300 focus:border-indigo-500"
              >
                <option value="">Load a sample essay ({SAMPLES.length})…</option>
                {SAMPLES.map((smp, i) => <option key={smp.name} value={i}>{smp.name}</option>)}
              </select>
            </div>
            <textarea
              id="essay"
              value={essay}
              onChange={e => setEssay(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEvaluate(); }}
              placeholder="Type or paste your essay here…"
              spellCheck
              className="mt-1.5 h-[22rem] w-full resize-y rounded-lg border border-slate-300 p-3 text-[15px] leading-relaxed outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 lg:h-[30rem]"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                <b className="text-slate-700">{words}</b> words · <b className="text-slate-700">{sentences}</b> sentences · {essay.length} characters
              </span>
              {words > 0 && words < MIN_WORDS && (
                <span className="text-amber-600">{MIN_WORDS - words} more words needed</span>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={loading || words < MIN_WORDS}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Evaluating…' : 'Evaluate Essay'}
              </button>
              <button
                type="button"
                onClick={handleNew}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" /> New
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">Tip: press Ctrl + Enter to evaluate</p>
          </div>

          {history.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <History className="h-4 w-4" /> Evaluated this session
              </h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {history.map(h => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => { setEssay(h.text); setTopic(h.topic); setResult(h.result); setEvaluatedText(h.text); setError(null); }}
                      className="flex w-full items-center gap-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${bandColor(h.result.rounded_score).chip}`}>
                        {h.result.score.toFixed(1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-700">{h.preview}…</span>
                        <span className="text-xs text-slate-400">{h.result.statistics.word_count} words · {h.time}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Results ────────────────────────────── */}
        <section ref={resultsRef} className="flex flex-col gap-4" aria-live="polite">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Evaluation failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}
          {loading && <LoadingState />}
          {!loading && !result && !error && <EmptyState />}
          {!loading && result && <Results result={result} stale={stale} />}
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-slate-400 sm:px-6">
        Scores come from a machine-learning model trained on ASAP 2.0 student essays (grades 6–12) and are an estimate,
        not a replacement for a teacher's judgement. Feedback is rule-based on measured text features.
      </footer>
    </div>
  );
}

function ModelBadge({ info }: { info: ModelInfo | null | undefined }) {
  if (info === undefined) return <span className="text-xs text-slate-400">Connecting…</span>;
  if (!info || !info.loaded)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
        <span className="h-2 w-2 rounded-full bg-red-500" /> Backend / model offline
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Model loaded
      <span className="hidden sm:inline">· test QWK {info.qwk?.toFixed(3)}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[24rem] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Wand2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-800">Ready when you are</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Write or paste an essay (at least {MIN_WORDS} words), optionally add its topic, and click
          <b> Evaluate Essay</b>. You will get a predicted score on the 1–6 scale, writing statistics and feedback.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Extracting features and running the model…
      </div>
      {[0, 1].map(i => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[0, 1, 2].map(j => <div key={j} className="h-16 rounded-lg bg-slate-100" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function bandColor(band: number) {
  if (band <= 2) return { ring: '#ef4444', chip: 'bg-red-100 text-red-700', text: 'text-red-600' };
  if (band === 3) return { ring: '#f59e0b', chip: 'bg-amber-100 text-amber-700', text: 'text-amber-600' };
  if (band === 4) return { ring: '#3b82f6', chip: 'bg-blue-100 text-blue-700', text: 'text-blue-600' };
  return { ring: '#10b981', chip: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600' };
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">{icon}{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Results({ result, stale }: { result: EvaluationResult; stale: boolean }) {
  const s = result.statistics;
  const c = bandColor(result.rounded_score);
  const pct = (result.score - result.scale.min) / (result.scale.max - result.scale.min);
  const R = 52, C = 2 * Math.PI * R;

  return (
    <>
      {stale && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <TriangleAlert className="h-4 w-4" /> The essay has changed since this evaluation. Click Evaluate Essay to update.
        </div>
      )}

      {/* Score */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle cx="60" cy="60" r={R} fill="none" stroke={c.ring} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)} className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="text-4xl font-bold text-slate-900">{result.score.toFixed(1)}</div>
                <div className="text-xs text-slate-500">out of {result.scale.max}</div>
              </div>
            </div>
          </div>
          <div className="w-full flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Predicted holistic score</p>
            <p className={`text-2xl font-bold ${c.text}`}>Band {result.rounded_score} · {result.label}</p>
            <div className="mt-3 grid grid-cols-6 gap-1">
              {result.scale.levels.map(l => (
                <div key={l.score} className="text-center">
                  <div className={`h-2 rounded-full ${l.score === result.rounded_score ? '' : 'bg-slate-200'}`}
                    style={l.score === result.rounded_score ? { background: c.ring } : undefined} />
                  <div className={`mt-1 text-[11px] ${l.score === result.rounded_score ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                    {l.score}
                  </div>
                  <div className="hidden text-[10px] leading-tight text-slate-400 sm:block">{l.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Score from the Ridge model (word + character TF-IDF + 17 features). Second opinion from a features-only Gradient Boosting model: {result.model_breakdown.gradient_boosting.toFixed(2)}.
              Scored in {result.elapsed_ms} ms.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <Card title="Writing statistics" icon={<ClipboardList className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Words" value={s.word_count} />
          <Stat label="Sentences" value={s.sentence_count} />
          <Stat label="Paragraphs" value={s.paragraph_count} />
          <Stat label="Avg. sentence" value={`${s.avg_sentence_length} w`} />
          <Stat label="Unique words" value={s.unique_words} />
          <Stat label="Type-token ratio" value={s.type_token_ratio.toFixed(2)} hint="unique ÷ total words" />
          <Stat label="Long words (7+)" value={`${Math.round(s.long_word_ratio * 100)}%`} />
          <Stat label="Avg. word length" value={`${s.avg_word_length}`} />
        </div>
      </Card>

      <Card title="Readability" icon={<BookOpen className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Flesch reading ease" value={s.flesch_reading_ease} hint={readingEaseLabel(s.flesch_reading_ease)} />
          <Stat label="Grade level (F-K)" value={s.flesch_kincaid_grade} />
          <Stat label="Transitions / 100 w" value={s.transition_words_per_100} />
          <Stat label="Reading time" value={`${s.reading_time_min} min`} />
        </div>
        {result.topic.provided && result.topic.keyword_overlap !== null && (
          <p className="mt-3 text-xs text-slate-500">
            Topic keyword overlap (TF-IDF cosine similarity): <b className="text-slate-700">{result.topic.keyword_overlap.toFixed(3)}</b>
            {' '}— a simple relevance indicator; it does not change the score.
          </p>
        )}
      </Card>

      {/* Feedback */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Strengths" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}>
          <List items={result.strengths} dot="bg-emerald-500" />
        </Card>
        <Card title="Areas to improve" icon={<TriangleAlert className="h-4 w-4 text-amber-500" />}>
          {result.weaknesses.length ? <List items={result.weaknesses} dot="bg-amber-500" /> :
            <p className="text-sm text-slate-500">No major weaknesses detected.</p>}
        </Card>
      </div>
      <Card title="Actionable suggestions" icon={<Lightbulb className="h-4 w-4 text-indigo-600" />}>
        <ol className="space-y-2">
          {result.suggestions.map((t, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </Card>
      <Card title="Basic mechanics checks (rule-based)" icon={<FileText className="h-4 w-4" />}>
        {result.mechanics_checks.length ? (
          <ul className="space-y-1.5">
            {result.mechanics_checks.map((m, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                  {m.type.replace('_', ' ')}
                </span>
                {m.message}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">No issues found by the simple checks.</p>}
        <p className="mt-3 text-[11px] text-slate-400">
          These checks catch capitalization, spacing, repeated and overused words only — they are not a full grammar checker.
        </p>
      </Card>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-slate-800">{value}</div>
      {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

function List({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-slate-700">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          {t}
        </li>
      ))}
    </ul>
  );
}

function readingEaseLabel(v: number) {
  if (v >= 80) return 'very easy';
  if (v >= 60) return 'plain English';
  if (v >= 50) return 'fairly difficult';
  if (v >= 30) return 'difficult';
  return 'very difficult';
}
