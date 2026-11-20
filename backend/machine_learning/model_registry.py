import numpy as np
from typing import Dict, Any, Tuple, List

# Scikit-learn Regressors
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor, GradientBoostingRegressor, HistGradientBoostingRegressor
from sklearn.svm import SVR

# Scikit-learn Classifiers
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, GradientBoostingClassifier, HistGradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB

# Gradient Boosted Trees
import xgboost as xgb
import lightgbm as lgb
import catboost as cb

class ModelRegistry:
    REGRESSION_MODELS = {
        'linear_regression': {
            'name': 'Linear Regression',
            'constructor': lambda: LinearRegression(),
            'optuna_space': lambda trial: {}
        },
        'ridge': {
            'name': 'Ridge Regression',
            'constructor': lambda alpha=1.0: Ridge(alpha=alpha, random_state=42),
            'optuna_space': lambda trial: {
                'alpha': trial.suggest_float('alpha', 1e-3, 100.0, log=True)
            }
        },
        'lasso': {
            'name': 'Lasso Regression',
            'constructor': lambda alpha=1.0: Lasso(alpha=alpha, random_state=42),
            'optuna_space': lambda trial: {
                'alpha': trial.suggest_float('alpha', 1e-3, 10.0, log=True)
            }
        },
        'elastic_net': {
            'name': 'ElasticNet',
            'constructor': lambda alpha=1.0, l1_ratio=0.5: ElasticNet(alpha=alpha, l1_ratio=l1_ratio, random_state=42),
            'optuna_space': lambda trial: {
                'alpha': trial.suggest_float('alpha', 1e-3, 10.0, log=True),
                'l1_ratio': trial.suggest_float('l1_ratio', 0.1, 0.9)
            }
        },
        'decision_tree': {
            'name': 'Decision Tree Regressor',
            'constructor': lambda max_depth=None, min_samples_split=2: DecisionTreeRegressor(max_depth=max_depth, min_samples_split=min_samples_split, random_state=42),
            'optuna_space': lambda trial: {
                'max_depth': trial.suggest_int('max_depth', 3, 20),
                'min_samples_split': trial.suggest_int('min_samples_split', 2, 10)
            }
        },
        'random_forest': {
            'name': 'Random Forest Regressor',
            'constructor': lambda n_estimators=100, max_depth=None: RandomForestRegressor(n_estimators=n_estimators, max_depth=max_depth, random_state=42, n_jobs=-1),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'max_depth': trial.suggest_int('max_depth', 4, 25)
            }
        },
        'extra_trees': {
            'name': 'Extra Trees Regressor',
            'constructor': lambda n_estimators=100, max_depth=None: ExtraTreesRegressor(n_estimators=n_estimators, max_depth=max_depth, random_state=42, n_jobs=-1),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'max_depth': trial.suggest_int('max_depth', 4, 25)
            }
        },
        'gradient_boosting': {
            'name': 'Gradient Boosting Regressor',
            'constructor': lambda n_estimators=100, learning_rate=0.1: GradientBoostingRegressor(n_estimators=n_estimators, learning_rate=learning_rate, random_state=42),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True)
            }
        },
        'hist_gradient_boosting': {
            'name': 'Hist Gradient Boosting Regressor',
            'constructor': lambda max_iter=100, learning_rate=0.1: HistGradientBoostingRegressor(max_iter=max_iter, learning_rate=learning_rate, random_state=42),
            'optuna_space': lambda trial: {
                'max_iter': trial.suggest_int('max_iter', 50, 200, step=25),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True)
            }
        },
        'xgboost': {
            'name': 'XGBoost Regressor',
            'constructor': lambda n_estimators=100, learning_rate=0.1, max_depth=6: xgb.XGBRegressor(n_estimators=n_estimators, learning_rate=learning_rate, max_depth=max_depth, random_state=42, verbosity=0),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'max_depth': trial.suggest_int('max_depth', 3, 10)
            }
        },
        'lightgbm': {
            'name': 'LightGBM Regressor',
            'constructor': lambda n_estimators=100, learning_rate=0.1: lgb.LGBMRegressor(n_estimators=n_estimators, learning_rate=learning_rate, random_state=42, verbose=-1),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'num_leaves': trial.suggest_int('num_leaves', 15, 63)
            }
        },
        'catboost': {
            'name': 'CatBoost Regressor',
            'constructor': lambda iterations=150, learning_rate=0.1: cb.CatBoostRegressor(iterations=iterations, learning_rate=learning_rate, random_seed=42, verbose=0),
            'optuna_space': lambda trial: {
                'iterations': trial.suggest_int('iterations', 100, 250, step=50),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'depth': trial.suggest_int('depth', 4, 8)
            }
        },
        'svr': {
            'name': 'Support Vector Regressor (SVR)',
            'constructor': lambda C=1.0, epsilon=0.1: SVR(C=C, epsilon=epsilon),
            'optuna_space': lambda trial: {
                'C': trial.suggest_float('C', 0.1, 100.0, log=True),
                'epsilon': trial.suggest_float('epsilon', 0.01, 0.5)
            }
        }
    }

    CLASSIFICATION_MODELS = {
        'logistic_regression': {
            'name': 'Logistic Regression',
            'constructor': lambda C=1.0: LogisticRegression(C=C, max_iter=1000, random_state=42),
            'optuna_space': lambda trial: {
                'C': trial.suggest_float('C', 1e-3, 100.0, log=True)
            }
        },
        'knn': {
            'name': 'K-Nearest Neighbors',
            'constructor': lambda n_neighbors=5: KNeighborsClassifier(n_neighbors=n_neighbors),
            'optuna_space': lambda trial: {
                'n_neighbors': trial.suggest_int('n_neighbors', 3, 15, step=2)
            }
        },
        'decision_tree': {
            'name': 'Decision Tree Classifier',
            'constructor': lambda max_depth=None, min_samples_split=2: DecisionTreeClassifier(max_depth=max_depth, min_samples_split=min_samples_split, random_state=42),
            'optuna_space': lambda trial: {
                'max_depth': trial.suggest_int('max_depth', 3, 20),
                'min_samples_split': trial.suggest_int('min_samples_split', 2, 10)
            }
        },
        'random_forest': {
            'name': 'Random Forest Classifier',
            'constructor': lambda n_estimators=100, max_depth=None: RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42, n_jobs=-1),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'max_depth': trial.suggest_int('max_depth', 4, 25)
            }
        },
        'extra_trees': {
            'name': 'Extra Trees Classifier',
            'constructor': lambda n_estimators=100, max_depth=None: ExtraTreesClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42, n_jobs=-1),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'max_depth': trial.suggest_int('max_depth', 4, 25)
            }
        },
        'gradient_boosting': {
            'name': 'Gradient Boosting Classifier',
            'constructor': lambda n_estimators=100, learning_rate=0.1: GradientBoostingClassifier(n_estimators=n_estimators, learning_rate=learning_rate, random_state=42),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True)
            }
        },
        'hist_gradient_boosting': {
            'name': 'Hist Gradient Boosting Classifier',
            'constructor': lambda max_iter=100, learning_rate=0.1: HistGradientBoostingClassifier(max_iter=max_iter, learning_rate=learning_rate, random_state=42),
            'optuna_space': lambda trial: {
                'max_iter': trial.suggest_int('max_iter', 50, 200, step=25),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True)
            }
        },
        'xgboost': {
            'name': 'XGBoost Classifier',
            'constructor': lambda n_estimators=100, learning_rate=0.1, max_depth=6: xgb.XGBClassifier(n_estimators=n_estimators, learning_rate=learning_rate, max_depth=max_depth, random_state=42, verbosity=0, eval_metric='logloss'),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'max_depth': trial.suggest_int('max_depth', 3, 10)
            }
        },
        'lightgbm': {
            'name': 'LightGBM Classifier',
            'constructor': lambda n_estimators=100, learning_rate=0.1: lgb.LGBMClassifier(n_estimators=n_estimators, learning_rate=learning_rate, random_state=42, verbose=-1),
            'optuna_space': lambda trial: {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200, step=25),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'num_leaves': trial.suggest_int('num_leaves', 15, 63)
            }
        },
        'catboost': {
            'name': 'CatBoost Classifier',
            'constructor': lambda iterations=150, learning_rate=0.1: cb.CatBoostClassifier(iterations=iterations, learning_rate=learning_rate, random_seed=42, verbose=0),
            'optuna_space': lambda trial: {
                'iterations': trial.suggest_int('iterations', 100, 250, step=50),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'depth': trial.suggest_int('depth', 4, 8)
            }
        },
        'svc': {
            'name': 'Support Vector Classifier (SVC)',
            'constructor': lambda C=1.0: SVC(C=C, probability=True, random_state=42),
            'optuna_space': lambda trial: {
                'C': trial.suggest_float('C', 0.1, 100.0, log=True)
            }
        },
        'naive_bayes': {
            'name': 'Gaussian Naive Bayes',
            'constructor': lambda: GaussianNB(),
            'optuna_space': lambda trial: {}
        }
    }

    @classmethod
    def get_model(cls, problem_type: str, model_key: str, params: Dict[str, Any] = None):
        params = params or {}
        catalog = cls.REGRESSION_MODELS if problem_type == 'regression' else cls.CLASSIFICATION_MODELS
        if model_key not in catalog:
            raise ValueError(f"Unknown model key '{model_key}' for problem type '{problem_type}'.")
        return catalog[model_key]['constructor'](**params)

    @classmethod
    def list_available_models(cls, problem_type: str) -> List[Dict[str, str]]:
        catalog = cls.REGRESSION_MODELS if problem_type == 'regression' else cls.CLASSIFICATION_MODELS
        return [{"key": k, "name": v['name']} for k, v in catalog.items()]
