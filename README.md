# AI Essay Evaluator

A web app that estimates a holistic essay score and gives rule-based writing feedback. Paste an essay, optionally provide its topic, and receive a predicted score on the **1–6 ASAP 2.0 scale**, writing and readability statistics, mechanics checks, and suggestions.

## What it does

- Scores essays with a saved machine-learning model; the app does not train a model when it starts.
- Reports the predicted score, rounded score band, and band label.
- Calculates word, sentence, paragraph, vocabulary, and readability statistics.
- Gives strengths, areas to improve, and suggestions based on measured features and simple rules.
- Flags a small set of mechanics issues, such as lowercase “I”, repeated words, and long sentences. These checks are not a full grammar or spelling checker.
- Lets you optionally enter a topic. The topic is used only for a keyword-overlap indicator and related feedback; it does **not** affect the score.
- Includes sample essays and keeps up to eight evaluations in memory for the current browser session. It does not provide persistent accounts or a database-backed history.

## How scoring works

The deployed scorer is a Ridge regression model trained on the ASAP 2.0 dataset. It combines:

1. Word-level TF-IDF features (1–2-grams; up to 20,000 features).
2. Character-level TF-IDF features (3–5 character n-grams; up to 30,000 features), which can capture spelling and word-form patterns.
3. Seventeen numeric text features, including length, vocabulary diversity, readability, sentence variation, paragraph count, and transition-word use.

The model predicts a continuous value, which is clipped to the 1–6 range. The UI also displays a feature-only Gradient Boosting prediction as a **second opinion**; Ridge supplies the reported score. The topic field is not needed by either model.

Feature extraction is shared between training and inference in [`src/features/model_features.py`](src/features/model_features.py) and [`src/features/text_features.py`](src/features/text_features.py).

### Dataset and evaluation

The project uses **ASAP 2.0** (Automated Student Assessment Prize 2.0), a dataset of 24,728 student essays on seven prompts, with holistic scores from 1 to 6. The dataset includes demographic fields, but these are not used as model features. Dataset files are not included in Git; obtain them through the applicable dataset access terms.

The reported final-model metrics use a random 80/20 train/test split (`random_state=42`), with 19,782 training essays and 4,946 test essays:

| Metric | Result |
|---|---:|
| Mean absolute error (MAE) | 0.4546 |
| Root mean squared error (RMSE) | 0.5834 |
| R² | 0.6805 |
| Quadratic weighted kappa (QWK) | 0.7754 |
| Exact accuracy after rounding | 63.04% |
| Within one score point | 98.48% |

These are held-out results from a random split, not a guarantee of performance on new prompts. Essays from the same prompts can appear in both the training and test sets, so performance on entirely new topics may be lower. The dataset also contains relatively few essays at score 6.

The model can reward length and vocabulary patterns even when an essay has weak reasoning or is off topic. It does not fact-check claims or reliably assess argument quality. Treat the score and automated feedback as suggestions for revision.

## Technology

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4
- **API:** Python, FastAPI, Uvicorn
- **Model and NLP:** pandas, NumPy, SciPy, scikit-learn, joblib, NLTK, textstat
- **Analysis:** Jupyter, matplotlib, seaborn

## Repository layout

```text
.
├── backend/
│   ├── main.py                    # FastAPI application and API endpoints
│   ├── essay_scorer.py            # Model loading, scoring, statistics, feedback
│   └── train_and_save_model.py    # Legacy baseline trainer; not used by the API
├── data/
│   ├── raw/                       # ASAP 2.0 source CSV (not tracked by Git)
│   └── processed/                 # Notebook-generated CSV (not tracked by Git)
├── frontend/
│   ├── src/App.tsx                # Active single-page application
│   ├── src/api.ts                 # Frontend API client and types
│   └── vite.config.ts             # Dev server and /api proxy
├── notebooks/
│   ├── 01_dataset_understanding.ipynb
│   ├── 02_eda.ipynb
│   ├── 03_preprocessing_and_features.ipynb
│   ├── 04_baseline_models.ipynb
│   └── 05_improved_models.ipynb
├── results/
│   ├── figures/                   # Analysis visualizations
│   ├── metrics/                   # Saved model and experiment metrics
│   └── models/                    # Trained model artifacts (not tracked by Git)
├── src/
│   ├── data/                      # Dataset loading and preprocessing helpers
│   ├── features/                  # Shared numeric and text feature extraction
│   └── models/                    # Baseline, evaluation, and final-model training
└── requirements.txt
```

The repository also contains some earlier frontend components/pages and a baseline trainer from development. The running Vite app starts at `frontend/src/main.tsx` and renders `frontend/src/App.tsx`; the API loads the final model bundle described below.

## Run locally (Windows PowerShell)

### Prerequisites

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ (required by the Vite version in the frontend lockfile)
- npm

### 1. Install dependencies

Run from the repository root:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

Set-Location .\frontend
npm ci
Set-Location ..
```

### 2. Provide or create the model artifact

The API expects this file:

```text
results/models/final_essay_scorer.joblib
```

Model artifacts are excluded from Git. If you have a compatible pre-trained bundle, place it at that path. Otherwise, prepare and train the model:

1. Obtain the ASAP 2.0 training CSV according to its access terms and place it at `data/raw/ASAP2_train_sourcetexts.csv`.
2. Run all cells in `notebooks/03_preprocessing_and_features.ipynb`. This creates `data/processed/essays_processed.csv`.
3. From the repository root, train and save the final model:

   ```powershell
   .\.venv\Scripts\python.exe src\models\train_final.py
   ```

Training takes several minutes and writes the model bundle and final metrics under `results/`. The `01` and `02` notebooks explore the data; `04` and `05` document baseline and improved experiments. They are not required to start the API when the final model bundle is already available.

The model is loaded with `joblib` and scikit-learn. For reliable inference, use a model artifact produced with the dependency versions intended for that artifact; scikit-learn does not guarantee compatibility of serialized models across versions.

### 3. Start the API

Open a terminal at the repository root and run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The server loads the model during startup and may download the NLTK `punkt` and `punkt_tab` tokenizer data the first time it runs. Keep this terminal open.

### 4. Start the frontend

In a second terminal:

```powershell
Set-Location .\frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite forwards requests under `/api` to the local FastAPI server on port 8000.

### Verify the API

- Health and model availability: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- Model details: [http://127.0.0.1:8000/api/model](http://127.0.0.1:8000/api/model)
- Interactive API documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

If the model bundle is missing, `/api/health` reports `model_missing`, and evaluation requests return an error rather than a fabricated score.

## API

All endpoints are served by `backend/main.py`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Reports service status and whether the model is loaded. |
| `GET` | `/api/model` | Returns model name, version, and saved test metrics when available. |
| `POST` | `/api/evaluate` | Evaluates one essay and returns its score, statistics, and feedback. |

Example request:

```json
{
  "essay": "Paste an essay of at least 30 words here.",
  "topic": "An optional essay topic or assignment prompt"
}
```

`topic` may be omitted or set to `null`. The API accepts essays up to 30,000 characters and topics up to 1,000 characters. Essays shorter than 30 words are rejected with HTTP 422. A successful response includes the continuous and rounded score, label, model breakdown, writing statistics, optional topic-overlap value, mechanics checks, strengths, weaknesses, suggestions, and evaluation time.

## Development checks

Run these commands from `frontend/`:

```powershell
npm run build
npm run lint
```

There is no dedicated automated test suite currently included in the repository.

## Data and generated files

The root `.gitignore` excludes raw and processed dataset CSVs, local virtual environments, frontend dependencies/build output, and saved model bundles. A fresh clone therefore needs the dataset and model bundle to be supplied or generated before essay evaluation will work. The tracked files in `results/metrics/` contain experiment summaries; they are not substitutes for the trained `.joblib` model.
