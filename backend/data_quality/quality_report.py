from typing import Dict, Any, List
import pandas as pd
import numpy as np

class QualityScoreCalculator:
    """
    Transparent, deterministic Data Quality Assessment algorithm.
    Every factor has a well-defined mathematical contribution and explanation.
    """

    WEIGHTS = {
        'completeness': 0.25,
        'uniqueness': 0.20,
        'validity': 0.20,
        'consistency': 0.15,
        'outlier_health': 0.20
    }

    @classmethod
    def calculate(cls, df: pd.DataFrame, profile: Dict[str, Any]) -> Dict[str, Any]:
        overview = profile['overview']
        total_rows = overview['total_rows']
        total_cols = overview['total_columns']
        total_cells = max(total_rows * total_cols, 1)

        recommendations: List[Dict[str, str]] = []

        # 1. Completeness Score (0 - 100)
        missing_cells = overview['total_missing_cells']
        missing_rate = missing_cells / total_cells
        completeness_score = max(0.0, round((1.0 - missing_rate) * 100, 2))
        if missing_rate > 0.05:
            recommendations.append({
                "type": "completeness",
                "severity": "high" if missing_rate > 0.2 else "medium",
                "message": f"Dataset has {missing_cells} missing cells ({missing_rate*100:.1f}%). Apply imputation strategies (Mean/Median/Mode) in the Cleaning Studio."
            })

        # 2. Uniqueness Score (0 - 100)
        duplicate_rows = overview['duplicate_rows']
        dup_rate = duplicate_rows / max(total_rows, 1)
        uniqueness_score = max(0.0, round((1.0 - dup_rate) * 100, 2))
        if duplicate_rows > 0:
            recommendations.append({
                "type": "uniqueness",
                "severity": "medium" if dup_rate > 0.05 else "low",
                "message": f"{duplicate_rows} duplicate rows detected ({dup_rate*100:.1f}%). Deduplication recommended to avoid model bias."
            })

        # 3. Validity & Type Correctness (0 - 100)
        # Check for mixed object types, trailing symbols, constant columns
        invalid_col_penalties = 0
        for col_info in profile['columns']:
            # Constant columns
            if col_info['is_constant']:
                invalid_col_penalties += 1
            # Mixed string/number detection in object columns
            if col_info['dtype_group'] == 'categorical':
                s = df[col_info['name']].dropna()
                # If numeric values disguised as strings
                num_count = s.astype(str).str.replace(r'[\$,%]', '', regex=True).str.replace('.', '', regex=False).str.isdigit().sum()
                if 0.3 < (num_count / max(len(s), 1)) < 0.9:
                    invalid_col_penalties += 0.5

        validity_rate = min(invalid_col_penalties / max(total_cols, 1), 1.0)
        validity_score = max(0.0, round((1.0 - validity_rate) * 100, 2))
        if overview['constant_columns']:
            recommendations.append({
                "type": "validity",
                "severity": "medium",
                "message": f"Columns {overview['constant_columns']} have zero variance (constant values). Consider dropping them."
            })

        # 4. Consistency & Cardinality (0 - 100)
        high_card_count = len(overview['high_cardinality_columns'])
        card_rate = min(high_card_count / max(total_cols, 1), 1.0)
        consistency_score = max(0.0, round((1.0 - card_rate * 0.8) * 100, 2))
        if overview['high_cardinality_columns']:
            recommendations.append({
                "type": "consistency",
                "severity": "low",
                "message": f"High cardinality columns {overview['high_cardinality_columns']} may act as surrogate IDs or cause sparse encodings."
            })

        # 5. Outlier Health (0 - 100)
        numeric_cols = [c for c in profile['columns'] if c['dtype_group'] == 'numeric' and c.get('stats')]
        if numeric_cols:
            total_outliers = sum(c['stats']['outliers_count'] for c in numeric_cols)
            total_num_points = sum(total_rows for _ in numeric_cols)
            outlier_rate = total_outliers / max(total_num_points, 1)
            outlier_score = max(0.0, round((1.0 - min(outlier_rate * 4, 1.0)) * 100, 2))
            if outlier_rate > 0.03:
                recommendations.append({
                    "type": "outliers",
                    "severity": "medium",
                    "message": f"Numeric columns show {total_outliers} outlier points ({outlier_rate*100:.1f}%). Review IQR or Winsorization in the Outliers tab."
                })
        else:
            outlier_score = 100.0

        # Weighted aggregate score
        final_score = round(
            completeness_score * cls.WEIGHTS['completeness'] +
            uniqueness_score * cls.WEIGHTS['uniqueness'] +
            validity_score * cls.WEIGHTS['validity'] +
            consistency_score * cls.WEIGHTS['consistency'] +
            outlier_score * cls.WEIGHTS['outlier_health'],
            1
        )

        if final_score >= 90:
            grade = 'A'
            status_text = 'Excellent'
        elif final_score >= 80:
            grade = 'B'
            status_text = 'Good'
        elif final_score >= 70:
            grade = 'C'
            status_text = 'Fair'
        elif final_score >= 60:
            grade = 'D'
            status_text = 'Needs Attention'
        else:
            grade = 'F'
            status_text = 'Poor'

        return {
            "overall_score": final_score,
            "grade": grade,
            "status_text": status_text,
            "components": {
                "completeness": {
                    "score": completeness_score,
                    "weight_pct": int(cls.WEIGHTS['completeness'] * 100),
                    "description": "Evaluates proportion of non-missing values across all cells."
                },
                "uniqueness": {
                    "score": uniqueness_score,
                    "weight_pct": int(cls.WEIGHTS['uniqueness'] * 100),
                    "description": "Measures lack of duplicate rows and record repetition."
                },
                "validity": {
                    "score": validity_score,
                    "weight_pct": int(cls.WEIGHTS['validity'] * 100),
                    "description": "Detects constant zero-variance features and mixed data-type irregularities."
                },
                "consistency": {
                    "score": consistency_score,
                    "weight_pct": int(cls.WEIGHTS['consistency'] * 100),
                    "description": "Penalizes uninformative high-cardinality text columns masquerading as categorical."
                },
                "outlier_health": {
                    "score": outlier_score,
                    "weight_pct": int(cls.WEIGHTS['outlier_health'] * 100),
                    "description": "Assesses presence of extreme statistical outliers via interquartile ranges."
                }
            },
            "recommendations": recommendations
        }
