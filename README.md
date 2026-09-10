# AI-Powered Essay Evaluation & Writing Assistant

**Capstone project — Review 1 checkpoint**

## Project goal (long-term)
A web-based AI writing coach: a student writes/uploads an essay, gets an automated score,
detailed feedback and improvement suggestions, and LSTM-based next-word predictions while typing.

## Scope of THIS checkpoint (Review 1)
Review 1 is about proving the fundamentals are solid, not shipping the app:
- Dataset understanding
- EDA
- Preprocessing
- Baseline ML models
- Evaluation (+ confusion matrix where it's actually applicable)
- Model comparison

No frontend, backend, or LSTM work happens until this baseline pipeline is done and understood.

## Dataset
- **Name:** ASAP 2.0 (Automated Student Assessment Prize, v2.0)
- **Task:** Automated Essay Scoring (regression)
- **File:** `data/raw/ASAP2_train_sourcetexts.csv`
- **Target:** `score` (human-assigned holistic score)
- **Primary input:** `full_text` (the essay)
- **Excluded from modeling:** `economically_disadvantaged`, `student_disability_status`, `ell_status`,
  `race_ethnicity`, `gender` — kept in the file only for optional fairness auditing, never as predictive features.

> **Current data note:** `data/raw/ASAP2_train_sourcetexts.csv` right now holds a sample/export used to
> validate the pipeline (see `notebooks/01_dataset_understanding.ipynb`, Section 8, for exact row counts
> and a couple of data quirks found in it — e.g. trailing fully-blank rows, which `load_raw_data()` strips
> automatically). All code is written generically against column names, not row counts or specific prompt
> names, so dropping in the full ~24,000-row file requires no code changes — just re-run the notebooks in
> order to re-validate the numbers.

## Project structure
```
AI-Essay-Evaluator/
├── data/
│   ├── raw/            # original CSV, untouched by any script
│   └── processed/      # cleaned data, saved by the preprocessing notebook
├── notebooks/
│   ├── 01_dataset_understanding.ipynb
│   ├── 02_eda.ipynb                     (next step)
│   ├── 03_preprocessing_and_features.ipynb
│   └── 04_baseline_models.ipynb
├── src/
│   ├── data/            # load_data.py, preprocess.py
│   ├── features/        # text_features.py, semantic_features.py
│   ├── models/           # baseline_models.py, evaluate.py
│   └── utils/
├── results/
│   ├── figures/          # saved plots from EDA
│   ├── metrics/          # saved metric tables (csv/json)
│   └── models/           # saved trained model files
├── requirements.txt
└── README.md
```

## How to run
```bash
pip install -r requirements.txt
jupyter notebook notebooks/01_dataset_understanding.ipynb
```

## Status
- [x] Step 0 — Project structure
- [x] Step 1 — Dataset understanding (`notebooks/01_dataset_understanding.ipynb`)
- [ ] Step 2 — EDA
- [ ] Step 3 — Preprocessing & feature engineering
- [ ] Step 4 — Baseline models, evaluation, secondary classification/confusion matrix, model comparison

## Key modeling decision (why regression, not classification)
`score` is a bounded, ordered numeric rating, so the primary task is **regression**. A confusion matrix
is a classification tool and does not apply directly to regression output. To satisfy the Review 1
checklist item on confusion matrices, a clearly-labeled **secondary classification experiment**
(score bucketed into e.g. Low/Medium/High) will be added in Step 4 — it is a demonstration alongside
the main pipeline, not a replacement for it.
