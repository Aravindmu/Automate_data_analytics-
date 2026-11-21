# AutoDataScience: Enterprise Automated Data Science, EDA & Machine Learning Platform

AutoDataScience is an enterprise-grade, modular, interactive, and extensible **Automated Data Science & Machine Learning Platform**. It transforms raw datasets into clean, profiled, visualized, and machine-learning-ready data, automatically training, evaluating, comparing, explaining, and deploying predictive models with zero data leakage.

---

## 🌟 12-Stage Scientific Workflow & Platform Capabilities

1. **Multi-Source Data Ingestion**:
   - Drag-and-drop file ingestion: CSV (`.csv`), Excel (`.xlsx`, `.xls`), JSON (`.json`), and Parquet (`.parquet`).
   - Secure REST API Integration: Configurable endpoint, HTTP method, Bearer token / API key, JSONPath nested extraction, timeout protection, and robust **SSRF validation**.
   - 1-Click Benchmark Datasets: Pre-packaged California Housing (Regression) and Bank Customer Churn (Classification) for instant demonstration.

2. **Automated Inspection & Profiling**:
   - Memory analysis, row/column counts, and comprehensive data-type classification (numeric, categorical, datetime, boolean, text).
   - Descriptive statistics: Mean, Median, Mode, Std, Variance, Quartiles, Interquartile Range (IQR), Skewness, Kurtosis, and distribution histogram previews.
   - Missing-value heatmap matrix for visual inspection of missingness patterns.
   - **Deterministic Data Quality Score (0–100 & Grade A-F)**: Transparent formula based on weighted dimensions (Completeness 25%, Uniqueness 20%, Validity 20%, Consistency 15%, and Outlier Health 20%).

3. **Automated Data Cleaning & Version Lineage**:
   - String normalization: snake_case column names, whitespace trimming, and placeholder nullification (`?`, `NA`, `null`, `None`, `-`).
   - Missing-value strategies: Numeric (Median, Mean, Constant, KNN) and Categorical (Mode, Missing Token, Constant).
   - Duplicate detection and deduplication.
   - Outlier detection via IQR, Z-Score, and Isolation Forest with configurable actions: Winsorize (capping), Remove, or Keep.
   - **Direct Cleaned Dataset Download**: Instant export of cleaned datasets in standard CSV/Parquet format.
   - **Strict Version Lineage**: Every cleaning or transformation run preserves original datasets and creates an immutable child version (`v1` &rarr; `v2`).

4. **Dynamic Exploratory Data Analysis (EDA)**:
   - Dynamic Plotly Studio generating responsive visualizations from actual dataset schemas.
   - Univariate (Histograms, Box plots, Violin plots, Bar frequency charts).
   - Bivariate (Scatter plots, Grouped bars, Box by category).
   - Multivariate (Correlation heatmaps, 3D scatter plots, PCA 2D/3D projections).
   - Time-series trends with moving average overlays.
   - Automated Suggested Chart Gallery.

5. **Feature Extraction**:
   - **Text NLP Features**: Word count, character count, uppercase counts, average word length, and top TF-IDF n-grams.
   - **Temporal Decomposition**: Datetime extraction of Year, Month, Day, Hour, Day of Week, Day Name, Weekend indicator, Quarter, and Day of Year.
   - **Polynomial Interactions**: Cross-product interactions ($A^2, B^2, A \times B$) for non-linear regression and classification surfaces.
   - **Categorical Encodings**: Target-mean encoding and frequency encoding for high-cardinality features.

6. **Feature Engineering**:
   - Arithmetic interaction features: Column arithmetic ($A \times B$, $A + B$, $A - B$, $A / B$).
   - Mathematical transforms: `log1p`, `sqrt`, and Yeo-Johnson PowerTransform.
   - Discretization & quantile binning.
   - Mutual Information and Random Forest Gini/Variance reduction ranking against any target column.

7. **Feature Selection**:
   - **Variance Thresholding**: Automatic detection and pruning of near-zero variance features.
   - **Collinearity Pruning**: Correlation matrix scanning identifying and flagging collinear feature pairs ($|r| \ge 0.90$).
   - **SelectKBest**: Information-gain feature pruning retaining the top $K$ most informative features via mutual information.
   - **Manual Feature Checklist**: 1-click targeted drop controls.

8. **Data Leakage Prevention Scanner**:
   - Automated pre-flight scanner for target proxy features, direct target contamination, near-perfect correlation ($|r| \ge 0.98$), entity identifier memorization (UUIDs, SSNs, primary keys), and constant values.
   - Categorized severity alerts (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with concrete remediation instructions.

9. **Automated Machine Learning (AutoML Studio)**:
   - **Automatic Problem Detection**: Auto-detects Regression vs Binary Classification vs Multiclass Classification with confidence rating.
   - **Imbalance Handling**: Class imbalance ratio assessment and automated resampling via **SMOTE**, **ADASYN**, Random Under-sampling, or class-balanced weighting.
   - Comprehensive Algorithm Catalog:
     - **Regression**: Linear Regression, Ridge, Lasso, ElasticNet, Decision Tree, Random Forest, Extra Trees, Gradient Boosting, HistGradientBoosting, XGBoost, LightGBM, CatBoost, SVR.
     - **Classification**: Logistic Regression, KNN, Decision Tree, Random Forest, Extra Trees, Gradient Boosting, HistGradientBoosting, XGBoost, LightGBM, CatBoost, SVC, Gaussian Naive Bayes.
   - **Optuna Hyperparameter Optimization**: Automated Bayesian optimization with cross-validation.
   - **Direct Downloads**: Immediate export of cleaned datasets and trained model pipelines (`.joblib`).

10. **Model Evaluation & Leaderboard Benchmark**:
    - Automatic ranking and prominent **Winner Identification** based on selected primary metric ($R^2$, RMSE, MAE, F1, Accuracy, ROC-AUC).
    - Holdout test evaluation: Confusion matrix heatmap for classification; Residuals plot for regression.
    - Global feature importance bar chart.
    - **1-Click Model Pipeline Download**: Direct `.joblib` model export.

11. **Dynamic Prediction Studio & Simulator**:
    - Interactive prediction form auto-generated from the model's ColumnTransformer schema.
    - Number inputs with min/max bounds and categorical observed dropdowns.
    - **1-Click Holdout Randomizer**: Samples an unseen test observation to test real-world inference.
    - Real-time prediction output with confidence gauge and class probability distributions.

12. **Model Intelligence & Explainability**:
    - **SHAP Feature Attribution**: Mean absolute SHAP values quantifying marginal feature impacts.
    - **Model Diagnostics**: Overfitting detection (train vs test generalization gap) and cross-validation variance stability.
    - **Error Analysis**: Worst-case residual analysis for regression and misclassified observations table for classification.
    - **What-If Simulator**: Perturb feature values across observed ranges to visualize predicted response curves.

13. **Analytical Reports & Production Exports**:
    - Executive PDF Report: Publication-grade analytical document generated using ReportLab.
    - Multi-tab Excel Workbook: Overview, Column Statistics, and ML Benchmarks generated with OpenPyXL.
    - Cleaned dataset download and serialized model artifact download (`.joblib`).
    - Persistent experiment metadata tracking in the SQLite database.

---

## 🎨 Professional Design System & UI/UX

- **Primary Theme (Professional Midnight Navy + Soft Neutral)**:
  - Primary Background: `#F5F7FA` | Surface: `#FFFFFF` | Sidebar: `#111827` | Brand: `#3157A4` | Accent: `#5278B8`
- **Dark Theme (Midnight Dark)**:
  - Primary Background: `#0D1320` | Surface: `#172235` | Sidebar: `#111A2B` | Brand: `#7899D4`
- **Functional Theme Switcher**: 1-click toggle in the header, persistent across navigation.
- **Enterprise Typography**: Inter font tokens, tabular numerals for analytical metrics, restrained 1px borders, subtle transitions.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.13, Django 6.1, Django REST Framework, Scikit-learn, XGBoost, LightGBM, CatBoost, Optuna, SHAP, Imbalanced-learn, Polars, DuckDB, Pandas, NumPy, ReportLab, OpenPyXL.
- **Database**: Default SQLite (`db.sqlite3`) for seamless zero-setup execution.
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, React Plotly.js, Zustand, TanStack Query.

---

## 🚀 Getting Started

### 1. Start the Django Backend

```powershell
cd backend
python manage.py migrate
python manage.py runserver 8000
```
Backend API will be live at `http://localhost:8000/api/`.

### 2. Start the Next.js Frontend

```powershell
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

- **Landing Page**: `http://localhost:3000`
- **Application Workspace**: `http://localhost:3000/dashboard`
