# AI Essay Evaluator

An AI-powered essay scoring and writing-feedback web app. A student pastes an essay
(and optionally its topic), and the app returns a **predicted holistic score on the 1–6 scale**
from a machine-learning model trained on real, teacher-graded essays. It also shows
writing statistics, readability metrics, strengths, weaknesses and suggestions.

## Features
- Essay editor with live word / sentence / character count
- Optional topic or assignment prompt (used for a keyword-overlap relevance indicator)
- **Evaluate Essay** sends the essay to a FastAPI backend that runs the trained model
- Predicted score (1–6, with the band label and the full scale)
- Writing statistics: words, sentences, paragraphs, average sentence length, unique words,
  type-token ratio, long-word ratio, average word length
- Readability: Flesch Reading Ease, Flesch-Kincaid grade, transition-word density, reading time
- Strengths, areas to improve, and actionable suggestions (rule-based, from the measured features)
- Basic mechanics checks (lowercase "i", lowercase sentence starts, very long sentences,
  doubled words, punctuation spacing, overused words)
- Two sample essays, loading and error states, and a list of essays evaluated in this session
  (click one to view it again). Evaluate as many essays as you like without restarting.

## Dataset
- **ASAP 2.0** (Automated Student Assessment Prize 2.0), `data/raw/ASAP2_train_sourcetexts.csv`
- 24,728 argumentative/source-based essays by US students (grades 6–12) on 7 prompts
- Target: `score`, the human holistic score, 1–6
  (distribution: 1 → 1,751 · 2 → 6,847 · 3 → 9,021 · 4 → 5,553 · 5 → 1,356 · 6 → 200)
- Demographic columns are **never** used as features.
- Cleaned data: `data/processed/essays_processed.csv` (produced by notebook 03)

## Model
Final model, trained by `src/models/train_final.py`:

**Ridge regression** on
1. word 1–2-gram TF-IDF (20,000 features),
2. character 3–5-gram TF-IDF (30,000 features; robust to misspellings), and
3. 17 standardised handcrafted features: length counts, average word/sentence length,
   sentence-length variation, unique words, type-token ratio, Flesch scores, log word count,
   long-word ratio, commas per sentence, paragraph count, lowercase-"i" rate,
   lowercase sentence-start rate, and transition-word rate.

It does **not** need the prompt label, so any essay can be scored. The alpha (10) was chosen with
3-fold cross-validation. A features-only Gradient Boosting model is shown in the UI as a
"second opinion", but it is not used for the score.

The website loads the saved file `results/models/final_essay_scorer.joblib`. It never trains a model at startup.
All features are computed by one shared module (`src/features/model_features.py`), so training
and the website use exactly the same code.

## Results (actual, held-out test set)
Same 80/20 split (`random_state=42`, 19,782 train / 4,946 test) as notebooks 04 and 05.
From `results/metrics/final_model_comparison.csv`:

| Model | MAE | RMSE | R² | QWK | Exact (rounded) | Within ±1 |
|---|---|---|---|---|---|---|
| Baseline: Random Forest, handcrafted features (nb 04) | 0.510 | 0.676 | 0.571 | – | – | – |
| Baseline: Ridge, TF-IDF only (nb 04) | 0.535 | 0.672 | 0.576 | – | – | – |
| Notebook 05 ensemble (**needs prompt label**) | 0.452 | 0.585 | 0.679 | 0.765 | 63.5% | 98.1% |
| Notebook 05 ensemble, prompt not given | 0.459 | 0.597 | 0.666 | 0.753 | 62.6% | 97.9% |
| Gradient Boosting, 17 features | 0.484 | 0.638 | 0.617 | 0.731 | 61.3% | 97.2% |
| Ridge + GB average | 0.454 | 0.590 | 0.673 | 0.764 | 63.8% | 98.1% |
| **FINAL: Ridge, word+char TF-IDF + 17 features** | **0.455** | **0.583** | **0.681** | **0.775** | 63.0% | **98.5%** |

QWK = quadratic weighted kappa, the standard metric for essay scoring.
Compared with the notebook 04 baselines, RMSE drops from 0.672 to 0.583 and R² rises from 0.576 to 0.681.
The final model matches or beats the notebook 05 model while **no longer needing the prompt**,
which is what lets the website accept any essay. The gain over notebook 05 is small; most of the
improvement came in notebook 05.

Secondary Low/Medium/High classification results (confusion matrices) are in notebooks 04/05 and
`results/metrics/*classification_results.csv`.

## Technology stack
- **ML/NLP:** Python, scikit-learn, pandas, NumPy, SciPy, NLTK, textstat, joblib
- **Backend:** FastAPI + Uvicorn
- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Vite, lucide-react icons

## Project structure
```
ai-essay-eval/
├── backend/
│   ├── main.py                 # FastAPI app (/api/health, /api/model, /api/evaluate)
│   ├── essay_scorer.py         # loads the saved model, scores the essay, builds feedback
│   └── train_and_save_model.py # legacy Random-Forest trainer (Review 1), not used by the app
├── frontend/                   # React + TypeScript + Tailwind app
├── data/raw, data/processed/   # dataset (not committed)
├── notebooks/01-05             # dataset understanding, EDA, preprocessing, baseline, improved models
├── src/
│   ├── data/                   # loading + cleaning
│   ├── features/               # text_features.py, model_features.py (shared by training + API)
│   └── models/                 # baseline_models.py, evaluate.py, train_final.py
├── results/figures, metrics, models/
├── start_backend.bat, start_frontend.bat
└── requirements.txt
```

## Installation (Windows, one time)
Requires Python 3.11+ (tested with 3.14) and Node.js 20+ (tested with 24).
Open PowerShell in the project folder:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
cd frontend
npm install
cd ..
```

If `results/models/final_essay_scorer.joblib` is missing, train it (about 4 minutes):
```powershell
.venv\Scripts\python src\models\train_final.py
```

## Running the app (Windows)
**Terminal 1: backend** (from the project folder)
```powershell
.venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Wait for `Application startup complete` (about 10–20 s while the model loads).

**Terminal 2: frontend**
```powershell
cd frontend
npm run dev
```
Open **http://localhost:5173**.

Or double-click `start_backend.bat` and then `start_frontend.bat`.

API docs: http://127.0.0.1:8000/docs

## Known limitations
- The model learned from ASAP 2.0 essays by students in grades 6–12 on 7 specific prompts.
  Scores for very different writing (university essays, creative writing, other topics) are less reliable.
- The score depends strongly on length and vocabulary features. A long essay that is off-topic
  or badly argued can still score fairly high. The model does not check facts or reasoning.
- Exact-band accuracy is about 63%. Predictions are within ±1 band about 98% of the time.
- Score 6 is rare in the data (200 essays), so the model seldom predicts above about 5.
- Strengths, weaknesses and suggestions are **rule-based** on measured features. They are not
  generated by the ML model.
- The mechanics checks are simple regex rules, **not a full grammar or spelling checker**.
- Topic relevance is a TF-IDF keyword-overlap number. It does not affect the score.
- Next-word prediction (LSTM) from the original plan is **not implemented**. The earlier
  hard-coded word-suggestion endpoint was removed so the demo doesn't present it as AI.
- The test split is random, so essays from the same prompts appear in both train and test.
  Results on completely new prompts are expected to be somewhat lower.
