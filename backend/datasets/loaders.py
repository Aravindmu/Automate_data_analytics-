import os
import json
import requests
import pandas as pd
import polars as pl
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from .validators import detect_encoding, detect_csv_delimiter, validate_ssrf_url

class DatasetLoader:
    @staticmethod
    def load_file_to_df(file_path: str, file_format: str, options: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        options = options or {}
        ext = os.path.splitext(file_path)[1].lower()

        if file_format == 'csv' or ext == '.csv':
            encoding = options.get('encoding') or detect_encoding(file_path)
            delimiter = options.get('delimiter') or detect_csv_delimiter(file_path, encoding)
            df = pd.read_csv(file_path, encoding=encoding, sep=delimiter, low_memory=False)
            return df

        elif file_format == 'excel' or ext in ['.xlsx', '.xls']:
            sheet_name = options.get('sheet_name', 0)
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            return df

        elif file_format == 'parquet' or ext == '.parquet':
            df = pd.read_parquet(file_path)
            return df

        elif file_format == 'json' or ext == '.json':
            json_path = options.get('json_path')
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                data = json.load(f)

            if json_path and isinstance(data, dict):
                # Navigate nested keys
                parts = json_path.strip('.').split('.')
                for p in parts:
                    if isinstance(data, dict) and p in data:
                        data = data[p]

            if isinstance(data, list):
                df = pd.json_normalize(data)
            elif isinstance(data, dict):
                # Try records or wrap
                df = pd.DataFrame([data])
            else:
                raise ValueError("JSON structure must contain an array or object of records.")
            return df

        else:
            # Fallback attempt
            try:
                return pd.read_csv(file_path, low_memory=False)
            except Exception:
                raise ValueError(f"Unsupported file format: {file_format}")

    @staticmethod
    def inspect_excel_sheets(file_path: str) -> list:
        """Return list of sheet names in an Excel workbook."""
        try:
            xl = pd.ExcelFile(file_path)
            return xl.sheet_names
        except Exception:
            return []

    @staticmethod
    def fetch_api_dataset(api_config: Dict[str, Any], save_dir: str) -> Tuple[str, pd.DataFrame, Dict[str, Any]]:
        """
        Fetch JSON data from a remote REST API with SSRF check, secure credential handling.
        Returns (saved_file_path, DataFrame, metadata).
        """
        url = api_config.get('url', '').strip()
        method = api_config.get('method', 'GET').upper()
        headers = api_config.get('headers', {})
        auth_type = api_config.get('auth_type', 'none')
        token = api_config.get('token', '')
        json_path = api_config.get('json_path', '')
        timeout = min(int(api_config.get('timeout', 30)), 60)

        # 1. SSRF Safety check
        validate_ssrf_url(url)

        # 2. Prepare headers
        req_headers = dict(headers)
        if auth_type == 'bearer' and token:
            req_headers['Authorization'] = f"Bearer {token}"
        elif auth_type == 'api_key' and token:
            key_name = api_config.get('api_key_header', 'X-API-Key')
            req_headers[key_name] = token

        # 3. Execute request
        resp = requests.request(method=method, url=url, headers=req_headers, timeout=timeout)
        resp.raise_for_status()

        data = resp.json()

        # 4. Extract data path if requested
        if json_path:
            parts = json_path.strip('.').split('.')
            for p in parts:
                if isinstance(data, dict) and p in data:
                    data = data[p]

        if isinstance(data, list):
            df = pd.json_normalize(data)
        elif isinstance(data, dict):
            df = pd.DataFrame([data])
        else:
            raise ValueError("API response must be a JSON array or object.")

        # 5. Save locally as Parquet or CSV
        os.makedirs(save_dir, exist_ok=True)
        filename = f"api_import_{int(pd.Timestamp.now().timestamp())}.parquet"
        saved_path = os.path.join(save_dir, filename)
        df.to_parquet(saved_path, index=False)

        # Safe metadata: mask sensitive credentials
        safe_meta = {
            "source_type": "api",
            "url": url,
            "method": method,
            "json_path": json_path,
            "auth_type": auth_type,
            "headers_provided": bool(headers),
        }

        return saved_path, df, safe_meta
