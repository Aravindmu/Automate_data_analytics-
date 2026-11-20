import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from sample_data.generator import SampleDataGenerator
from data_quality.profiler import DatasetProfiler
from data_quality.quality_report import QualityScoreCalculator
from datasets.loaders import DatasetLoader
from machine_learning.trainer import ModelTrainerService
from machine_learning.prediction import DynamicPredictor
from reports.pdf_generator import PDFReportGenerator
from reports.excel_generator import ExcelReportGenerator
from experiments.models import Experiment

print("1. Creating California Housing sample dataset...")
d1 = SampleDataGenerator.load_california_housing()
print(f"California Housing loaded: ID={d1.id}, Rows={d1.row_count}, Cols={d1.column_count}")

print("2. Creating Customer Churn sample dataset...")
d2 = SampleDataGenerator.load_customer_churn()
print(f"Customer Churn loaded: ID={d2.id}, Rows={d2.row_count}, Cols={d2.column_count}")

print("3. Testing Profiler and Quality Assessment...")
df = DatasetLoader.load_file_to_df(d1.file_path, d1.file_format)
prof = DatasetProfiler.profile(df)
q = QualityScoreCalculator.calculate(df, prof)
print(f"Quality Score: {q['overall_score']}/100, Grade: {q['grade']} ({q['status_text']})")

print("4. Testing Model Trainer on Housing (Ridge + Random Forest)...")
ml_res = ModelTrainerService.train_models(d1, {
    'target_column': 'MedianHouseValue',
    'problem_type': 'regression',
    'algorithms': ['ridge', 'random_forest'],
    'primary_metric': 'r2',
    'cv_folds': 2,
    'test_size': 0.2
})
best = ml_res['best_model']
print(f"Best Model Winner: {best['model_name']} with R2: {best['metrics']['r2']}")

print("5. Testing Dynamic Inference...")
sample_input = {col: float(df[col].dropna().median()) for col in df.columns if col != 'MedianHouseValue'}
pred_res = DynamicPredictor.predict(best['artifact_path'], sample_input, 'regression')
print(f"Dynamic Prediction Result: {pred_res['prediction']}")

print("6. Testing PDF & Excel Report generation...")
exps = list(Experiment.objects.filter(dataset=d1))
pdf_buf = PDFReportGenerator.generate_analytical_report(d1, prof, q, exps)
excel_buf = ExcelReportGenerator.generate_excel_workbook(d1, prof, q, exps)
print(f"PDF Generated: {len(pdf_buf.getvalue())} bytes")
print(f"Excel Generated: {len(excel_buf.getvalue())} bytes")

print("=== ALL BACKEND MODULES OPERATIONAL & VERIFIED ===")
