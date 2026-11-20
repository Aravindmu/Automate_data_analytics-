import os
import pandas as pd
import numpy as np
from pathlib import Path
from django.conf import settings
from sklearn.datasets import fetch_california_housing, load_breast_cancer, load_diabetes
from datasets.models import Dataset
from projects.services import ProjectService

class SampleDataGenerator:
    @staticmethod
    def load_california_housing(project=None) -> Dataset:
        """Loads the real California Housing benchmark dataset for regression."""
        save_dir = settings.MEDIA_ROOT / 'datasets'
        os.makedirs(save_dir, exist_ok=True)
        file_path = save_dir / 'sample_california_housing.csv'

        data = fetch_california_housing(as_frame=True)
        df = data.frame
        # Rename target to MedianHouseValue
        df.rename(columns={'MedHouseVal': 'MedianHouseValue'}, inplace=True)
        
        # Introduce a few realistic missing values (0.5%) and an outlier or two for demo cleaning
        np.random.seed(42)
        mask = np.random.rand(*df.shape) < 0.008
        df = df.mask(mask)

        df.to_csv(file_path, index=False)
        file_size = os.path.getsize(file_path)

        if not project:
            project = ProjectService.get_or_create_default_project()

        dataset, _ = Dataset.objects.update_or_create(
            name="California Housing (Regression Benchmark)",
            defaults={
                'project': project,
                'file_path': str(file_path),
                'original_filename': 'sample_california_housing.csv',
                'file_format': 'csv',
                'file_size': file_size,
                'row_count': len(df),
                'column_count': len(df.columns),
                'version': 1,
                'processing_status': 'uploaded',
                'metadata': {
                    'description': 'Real California Housing dataset from StatLib repository (20,640 records). Target: MedianHouseValue.',
                    'columns': list(df.columns),
                    'is_sample_data': True,
                    'suggested_target': 'MedianHouseValue',
                    'suggested_problem_type': 'regression'
                }
            }
        )
        return dataset

    @staticmethod
    def load_customer_churn(project=None) -> Dataset:
        """Generates realistic Customer Churn dataset for binary classification."""
        save_dir = settings.MEDIA_ROOT / 'datasets'
        os.makedirs(save_dir, exist_ok=True)
        file_path = save_dir / 'sample_customer_churn.csv'

        np.random.seed(42)
        n_samples = 2500
        geographies = ['France', 'Spain', 'Germany']
        genders = ['Female', 'Male']

        credit_score = np.random.normal(650, 95, n_samples).astype(int).clip(350, 850)
        geography = np.random.choice(geographies, n_samples, p=[0.5, 0.25, 0.25])
        gender = np.random.choice(genders, n_samples)
        age = np.random.normal(38, 10, n_samples).astype(int).clip(18, 90)
        tenure = np.random.randint(0, 11, n_samples)
        balance = np.where(np.random.rand(n_samples) > 0.3, np.random.uniform(20000, 220000, n_samples), 0.0).round(2)
        num_products = np.random.choice([1, 2, 3, 4], n_samples, p=[0.5, 0.45, 0.04, 0.01])
        has_card = np.random.choice([0, 1], n_samples, p=[0.3, 0.7])
        is_active = np.random.choice([0, 1], n_samples, p=[0.48, 0.52])
        salary = np.random.uniform(15000, 180000, n_samples).round(2)

        # Realistic churn logic with noise
        churn_logit = (age - 35) * 0.06 - (is_active * 0.9) + (num_products > 2) * 1.2 + (balance > 100000) * 0.4 - 1.5
        churn_prob = 1 / (1 + np.exp(-churn_logit))
        churn = (np.random.rand(n_samples) < churn_prob).astype(int)

        df = pd.DataFrame({
            'CreditScore': credit_score,
            'Geography': geography,
            'Gender': gender,
            'Age': age,
            'Tenure': tenure,
            'Balance': balance,
            'NumOfProducts': num_products,
            'HasCrCard': has_card,
            'IsActiveMember': is_active,
            'EstimatedSalary': salary,
            'Exited': churn
        })

        # Inject minor missing placeholders
        df.loc[np.random.choice(n_samples, 20), 'CreditScore'] = np.nan
        df.loc[np.random.choice(n_samples, 15), 'Gender'] = '?'

        df.to_csv(file_path, index=False)
        file_size = os.path.getsize(file_path)

        if not project:
            project = ProjectService.get_or_create_default_project()

        dataset, _ = Dataset.objects.update_or_create(
            name="Bank Customer Churn (Classification Benchmark)",
            defaults={
                'project': project,
                'file_path': str(file_path),
                'original_filename': 'sample_customer_churn.csv',
                'file_format': 'csv',
                'file_size': file_size,
                'row_count': len(df),
                'column_count': len(df.columns),
                'version': 1,
                'processing_status': 'uploaded',
                'metadata': {
                    'description': 'Customer banking dataset with demographic, account and churn status. Target: Exited (0 = Stayed, 1 = Churned).',
                    'columns': list(df.columns),
                    'is_sample_data': True,
                    'suggested_target': 'Exited',
                    'suggested_problem_type': 'binary_classification'
                }
            }
        )
        return dataset
