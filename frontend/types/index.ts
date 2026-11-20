export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  dataset_count: number;
  experiment_count: number;
}

export interface Dataset {
  id: string;
  project: string | null;
  name: string;
  file_path: string;
  original_filename: string;
  file_format: string;
  file_size: number;
  formatted_size: string;
  row_count: number;
  column_count: number;
  version: number;
  parent_dataset: string | null;
  processing_status: 'uploaded' | 'profiled' | 'cleaned' | 'transformed' | 'error';
  metadata: Record<string, any>;
  cleaning_history: any[];
  created_at: string;
  updated_at: string;
}

export interface ColumnStat {
  name: string;
  dtype: string;
  dtype_group: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text';
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  unique_pct: number;
  is_constant: boolean;
  is_high_cardinality: boolean;
  stats?: {
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
    q25?: number;
    q50?: number;
    q75?: number;
    iqr?: number;
    skewness?: number;
    kurtosis?: number;
    outliers_count?: number;
    outliers_pct?: number;
    top_value?: string;
    top_frequency?: number;
    top_frequency_pct?: number;
    rare_categories_count?: number;
    category_distribution?: Record<string, number>;
  } | null;
  histogram?: {
    bins: number[];
    counts: number[];
  } | null;
}

export interface QualityComponent {
  score: number;
  weight_pct: number;
  description: string;
}

export interface QualityScore {
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status_text: string;
  components: {
    completeness: QualityComponent;
    uniqueness: QualityComponent;
    validity: QualityComponent;
    consistency: QualityComponent;
    outlier_health: QualityComponent;
  };
  recommendations: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
}

export interface DatasetProfile {
  dataset_id: string;
  name: string;
  version: number;
  profiling: {
    overview: {
      total_rows: number;
      total_columns: number;
      memory_usage_mb: number;
      duplicate_rows: number;
      duplicate_pct: number;
      total_missing_cells: number;
      missing_pct: number;
      numeric_columns_count: number;
      categorical_columns_count: number;
      datetime_columns_count: number;
      boolean_columns_count: number;
      text_columns_count: number;
      constant_columns: string[];
      high_cardinality_columns: string[];
    };
    columns: ColumnStat[];
    missing_matrix: {
      columns: string[];
      matrix: number[][];
      sample_rows: number;
    };
  };
  quality_score: QualityScore;
}

export interface ChartSuggestion {
  id: string;
  title: string;
  category: string;
  chart_type: string;
  x?: string;
  y?: string;
  color?: string;
  description: string;
}

export interface ModelComparisonItem {
  experiment_id: string;
  model_key: string;
  model_name: string;
  metrics: Record<string, any>;
  cv_score_mean: number;
  cv_score_std: number;
  training_time: number;
  feature_importance: Array<{ feature: string; importance: number }>;
  diagnostics?: {
    overfit_risk: 'LOW' | 'MODERATE' | 'HIGH';
    generalization_gap: number;
    overfit_assessment: string;
    cv_stability: string;
    cv_std: number;
    train_score: number;
    test_score: number;
  };
  shap?: {
    available: boolean;
    summary: Array<{ feature: string; mean_shap: number }>;
  };
  tuning_applied: boolean;
  best_hyperparameters: Record<string, any>;
  artifact_path: string;
}

export interface LeakageWarning {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  columns: string[];
  recommendation: string;
}

export interface LeakageReport {
  is_safe: boolean;
  total_warnings: number;
  target_column: string;
  warnings: LeakageWarning[];
}

export interface ImbalanceReport {
  is_imbalanced: boolean;
  severity: string;
  imbalance_ratio: number;
  total_samples: number;
  class_distribution: Record<string, { count: number; percentage: number }>;
  recommendation: string;
}

export interface TrainingResult {
  dataset_id: string;
  target_column: string;
  problem_type: string;
  primary_metric: string;
  total_models_trained: number;
  execution_time_total: number;
  best_model: ModelComparisonItem;
  models_comparison: ModelComparisonItem[];
  train_size: number;
  test_size: number;
  leakage_check?: LeakageReport;
  imbalance_assessment?: ImbalanceReport;
  imbalance_mitigation?: any;
}

export interface ExperimentItem {
  id: string;
  project: string | null;
  dataset: string;
  dataset_name: string;
  model_name: string;
  model_key: string;
  problem_type: string;
  target_column: string;
  features: string[];
  hyperparameters: Record<string, any>;
  metrics: Record<string, any>;
  cv_scores: { mean: number; std: number; folds: number };
  training_time_seconds: number;
  artifact_path: string;
  input_schema: {
    numeric?: Record<string, { min: number; max: number; median: number }>;
    categorical?: Record<string, string[]>;
    target?: string;
    problem_type?: string;
  };
  created_at: string;
}

export interface SampleBenchmark {
  id: string;
  title: string;
  problem_type: string;
  target_column: string;
  description: string;
  features_count: number;
  rows_count: number;
  endpoint: string;
}
