"""
load_data.py

One simple function: load the ASAP 2.0 CSV into a pandas DataFrame.

Kept deliberately basic (no classes, no config objects) so it is easy
to explain in a viva.
"""

import pandas as pd

RAW_DATA_PATH = "../data/raw/ASAP2_train_sourcetexts.csv"

# Demographic columns exist in the raw file but must never be used as
# predictive features (see Review 1 report, Section 3.3).
DEMOGRAPHIC_COLUMNS = [
    "economically_disadvantaged",
    "student_disability_status",
    "ell_status",
    "race_ethnicity",
    "gender",
]


def load_raw_data(path: str = RAW_DATA_PATH, drop_fully_blank_rows: bool = True) -> pd.DataFrame:
    """
    Load the raw ASAP 2.0 CSV exactly as provided.

    Parameters
    ----------
    path : str
        Path to the CSV file.
    drop_fully_blank_rows : bool
        If True, rows where every single column is NaN are removed.
        (We found the training export contains such rows -- see the
        01_dataset_understanding notebook for the exact count. This
        does NOT delete any real essay; it only removes rows that
        contain absolutely no data.)

    Returns
    -------
    pd.DataFrame
    """
    df = pd.read_csv(path)

    if drop_fully_blank_rows:
        n_before = len(df)
        df = df.dropna(how="all").reset_index(drop=True)
        n_after = len(df)
        if n_before != n_after:
            print(f"[load_raw_data] Dropped {n_before - n_after} fully-blank rows "
                  f"({n_before} -> {n_after} rows).")

    return df


if __name__ == "__main__":
    # Simple manual check when running this file directly:
    #   python src/data/load_data.py
    data = load_raw_data()
    print(data.shape)
    print(data.head())
