import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

class VisualizationService:
    THEME_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6']

    @classmethod
    def generate_chart(cls, df: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        chart_type = config.get('chart_type', 'histogram')
        x_col = config.get('x')
        y_col = config.get('y')
        z_col = config.get('z')
        color_col = config.get('color')
        agg = config.get('aggregation', 'mean')
        title = config.get('title', f"{chart_type.title()} Plot")
        top_n = int(config.get('top_n', 15))

        data = []
        layout = {
            "title": {"text": title, "font": {"size": 16, "color": "#1e293b"}},
            "paper_bgcolor": "transparent",
            "plot_bgcolor": "rgba(248, 250, 252, 0.5)",
            "margin": {"l": 50, "r": 30, "t": 50, "b": 50},
            "font": {"family": "Inter, system-ui, sans-serif"},
            "hovermode": "closest",
        }

        # 1. Histogram
        if chart_type == 'histogram':
            if not x_col or x_col not in df.columns:
                raise ValueError("Valid 'x' column is required for histogram.")
            clean_s = df[x_col].dropna()

            if color_col and color_col in df.columns:
                unique_groups = df[color_col].dropna().unique()[:6]
                for idx, grp in enumerate(unique_groups):
                    grp_vals = df[df[color_col] == grp][x_col].dropna().tolist()
                    data.append({
                        "type": "histogram",
                        "x": grp_vals,
                        "name": str(grp),
                        "opacity": 0.7,
                        "marker": {"color": cls.THEME_COLORS[idx % len(cls.THEME_COLORS)]}
                    })
                layout["barmode"] = "overlay"
            else:
                data.append({
                    "type": "histogram",
                    "x": clean_s.tolist(),
                    "name": x_col,
                    "marker": {"color": "#3b82f6", "line": {"color": "#1d4ed8", "width": 1}},
                    "opacity": 0.85
                })
            layout["xaxis"] = {"title": x_col}
            layout["yaxis"] = {"title": "Count"}

        # 2. Box Plot
        elif chart_type == 'box':
            if not y_col or y_col not in df.columns:
                # If only x provided, use x as y
                y_col = x_col
            if x_col and x_col != y_col and x_col in df.columns:
                # Grouped box plot
                top_cats = df[x_col].value_counts().head(top_n).index
                filtered_df = df[df[x_col].isin(top_cats)]
                for idx, cat in enumerate(top_cats):
                    cat_vals = filtered_df[filtered_df[x_col] == cat][y_col].dropna().tolist()
                    data.append({
                        "type": "box",
                        "y": cat_vals,
                        "name": str(cat),
                        "marker": {"color": cls.THEME_COLORS[idx % len(cls.THEME_COLORS)]},
                        "boxpoints": "outliers"
                    })
                layout["xaxis"] = {"title": x_col}
            else:
                data.append({
                    "type": "box",
                    "y": df[y_col].dropna().tolist(),
                    "name": y_col,
                    "marker": {"color": "#3b82f6"},
                    "boxpoints": "outliers"
                })
            layout["yaxis"] = {"title": y_col}

        # 3. Violin Plot
        elif chart_type == 'violin':
            y_col = y_col or x_col
            if x_col and x_col != y_col and x_col in df.columns:
                top_cats = df[x_col].value_counts().head(8).index
                filtered_df = df[df[x_col].isin(top_cats)]
                for idx, cat in enumerate(top_cats):
                    cat_vals = filtered_df[filtered_df[x_col] == cat][y_col].dropna().tolist()
                    data.append({
                        "type": "violin",
                        "y": cat_vals,
                        "name": str(cat),
                        "box": {"visible": True},
                        "meanline": {"visible": True},
                        "marker": {"color": cls.THEME_COLORS[idx % len(cls.THEME_COLORS)]}
                    })
                layout["xaxis"] = {"title": x_col}
            else:
                data.append({
                    "type": "violin",
                    "y": df[y_col].dropna().tolist(),
                    "name": y_col,
                    "box": {"visible": True},
                    "meanline": {"visible": True},
                    "marker": {"color": "#6366f1"}
                })
            layout["yaxis"] = {"title": y_col}

        # 4. Scatter Plot (2D)
        elif chart_type == 'scatter':
            if not x_col or not y_col or x_col not in df.columns or y_col not in df.columns:
                raise ValueError("Both 'x' and 'y' columns are required for scatter plot.")

            sample_df = df[[x_col, y_col] + ([color_col] if color_col and color_col in df.columns else [])].dropna()
            if len(sample_df) > 2000:
                sample_df = sample_df.sample(2000, random_state=42)

            if color_col and color_col in sample_df.columns:
                if pd.api.types.is_numeric_dtype(sample_df[color_col]):
                    data.append({
                        "type": "scatter",
                        "mode": "markers",
                        "x": sample_df[x_col].tolist(),
                        "y": sample_df[y_col].tolist(),
                        "marker": {
                            "size": 7,
                            "color": sample_df[color_col].tolist(),
                            "colorscale": "Viridis",
                            "showscale": True,
                            "colorbar": {"title": color_col, "len": 0.6}
                        }
                    })
                else:
                    for idx, grp in enumerate(sample_df[color_col].unique()[:6]):
                        sub = sample_df[sample_df[color_col] == grp]
                        data.append({
                            "type": "scatter",
                            "mode": "markers",
                            "x": sub[x_col].tolist(),
                            "y": sub[y_col].tolist(),
                            "name": str(grp),
                            "marker": {"size": 7, "color": cls.THEME_COLORS[idx % len(cls.THEME_COLORS)]}
                        })
            else:
                data.append({
                    "type": "scatter",
                    "mode": "markers",
                    "x": sample_df[x_col].tolist(),
                    "y": sample_df[y_col].tolist(),
                    "marker": {"size": 7, "color": "#2563eb", "opacity": 0.75}
                })

            layout["xaxis"] = {"title": x_col}
            layout["yaxis"] = {"title": y_col}

        # 5. Bar / Count Plot
        elif chart_type in ['bar', 'count']:
            if not x_col or x_col not in df.columns:
                raise ValueError("Valid 'x' column is required for bar chart.")

            if y_col and y_col in df.columns:
                # Aggregated bar
                grouped = df.groupby(x_col)[y_col]
                if agg == 'sum':
                    res = grouped.sum()
                elif agg == 'median':
                    res = grouped.median()
                elif agg == 'count':
                    res = grouped.count()
                else:
                    res = grouped.mean()
                res = res.sort_values(ascending=False).head(top_n)
                x_vals = [str(x) for x in res.index]
                y_vals = [round(float(v), 2) for v in res.values]
                y_title = f"{agg.title()} of {y_col}"
            else:
                # Frequency count
                counts = df[x_col].value_counts().head(top_n)
                x_vals = [str(x) for x in counts.index]
                y_vals = [int(v) for v in counts.values]
                y_title = "Frequency"

            data.append({
                "type": "bar",
                "x": x_vals,
                "y": y_vals,
                "marker": {"color": "#3b82f6"}
            })
            layout["xaxis"] = {"title": x_col, "tickangle": -30}
            layout["yaxis"] = {"title": y_title}

        # 6. Correlation Heatmap
        elif chart_type == 'correlation_heatmap':
            method = config.get('method', 'pearson')
            num_df = df.select_dtypes(include=[np.number])
            if num_df.shape[1] < 2:
                raise ValueError("At least 2 numeric columns required for correlation heatmap.")

            corr = num_df.corr(method=method).round(2)
            cols = list(corr.columns)
            z_vals = corr.values.tolist()

            data.append({
                "type": "heatmap",
                "x": cols,
                "y": cols,
                "z": z_vals,
                "colorscale": "RdBu",
                "zmin": -1.0,
                "zmax": 1.0,
                "hoverongaps": False,
            })
            layout["xaxis"] = {"tickangle": -45}
            layout["yaxis"] = {"autorange": "reversed"}

        # 7. 3D Scatter Plot
        elif chart_type == 'scatter3d':
            if not x_col or not y_col or not z_col or any(c not in df.columns for c in [x_col, y_col, z_col]):
                raise ValueError("X, Y, and Z columns are required for 3D scatter.")

            cols = [x_col, y_col, z_col]
            if color_col and color_col in df.columns:
                cols.append(color_col)
            s_df = df[cols].dropna()
            if len(s_df) > 1500:
                s_df = s_df.sample(1500, random_state=42)

            trace = {
                "type": "scatter3d",
                "mode": "markers",
                "x": s_df[x_col].tolist(),
                "y": s_df[y_col].tolist(),
                "z": s_df[z_col].tolist(),
                "marker": {"size": 4, "opacity": 0.8}
            }

            if color_col and color_col in s_df.columns and pd.api.types.is_numeric_dtype(s_df[color_col]):
                trace["marker"]["color"] = s_df[color_col].tolist()
                trace["marker"]["colorscale"] = "Plasma"
                trace["marker"]["showscale"] = True

            data.append(trace)
            layout["scene"] = {
                "xaxis": {"title": x_col},
                "yaxis": {"title": y_col},
                "zaxis": {"title": z_col}
            }

        # 8. PCA Projection (2D or 3D)
        elif chart_type in ['pca2d', 'pca3d']:
            num_cols = list(df.select_dtypes(include=[np.number]).columns)
            if len(num_cols) < 2:
                raise ValueError("At least 2 numeric columns required for PCA.")

            n_components = 3 if chart_type == 'pca3d' and len(num_cols) >= 3 else 2
            pca_df = df[num_cols].dropna()
            if len(pca_df) > 1500:
                pca_df = pca_df.sample(1500, random_state=42)

            scaler = StandardScaler()
            scaled = scaler.fit_transform(pca_df)

            pca = PCA(n_components=n_components)
            comps = pca.fit_transform(scaled)
            exp_var = [round(float(v) * 100, 1) for v in pca.explained_variance_ratio_]

            if n_components == 2:
                trace = {
                    "type": "scatter",
                    "mode": "markers",
                    "x": comps[:, 0].tolist(),
                    "y": comps[:, 1].tolist(),
                    "marker": {"size": 6, "color": "#6366f1", "opacity": 0.8}
                }
                data.append(trace)
                layout["xaxis"] = {"title": f"PC1 ({exp_var[0]}% var)"}
                layout["yaxis"] = {"title": f"PC2 ({exp_var[1]}% var)"}
            else:
                trace = {
                    "type": "scatter3d",
                    "mode": "markers",
                    "x": comps[:, 0].tolist(),
                    "y": comps[:, 1].tolist(),
                    "z": comps[:, 2].tolist(),
                    "marker": {"size": 4, "color": comps[:, 0].tolist(), "colorscale": "Viridis", "opacity": 0.8}
                }
                data.append(trace)
                layout["scene"] = {
                    "xaxis": {"title": f"PC1 ({exp_var[0]}%)"},
                    "yaxis": {"title": f"PC2 ({exp_var[1]}%)"},
                    "zaxis": {"title": f"PC3 ({exp_var[2]}%)"}
                }

        # 9. Time Series Trend
        elif chart_type == 'timeseries':
            if not x_col or not y_col or x_col not in df.columns or y_col not in df.columns:
                raise ValueError("Date (x) and numeric metric (y) required for time series.")

            ts_df = df[[x_col, y_col]].dropna().copy()
            ts_df[x_col] = pd.to_datetime(ts_df[x_col], errors='coerce')
            ts_df = ts_df.dropna().sort_values(by=x_col)

            # Raw trend
            data.append({
                "type": "scatter",
                "mode": "lines",
                "x": ts_df[x_col].dt.strftime('%Y-%m-%d').tolist(),
                "y": ts_df[y_col].tolist(),
                "name": y_col,
                "line": {"color": "#3b82f6", "width": 1.5}
            })

            # Moving average if sufficient data
            if len(ts_df) > 14:
                window = min(7, len(ts_df) // 3)
                ma = ts_df[y_col].rolling(window=window).mean()
                data.append({
                    "type": "scatter",
                    "mode": "lines",
                    "x": ts_df[x_col].dt.strftime('%Y-%m-%d').tolist(),
                    "y": ma.tolist(),
                    "name": f"{window}-step Moving Avg",
                    "line": {"color": "#f59e0b", "width": 2.5, "dash": "dash"}
                })

            layout["xaxis"] = {"title": x_col}
            layout["yaxis"] = {"title": y_col}

        return {"data": data, "layout": layout}

    @classmethod
    def get_suggested_gallery(cls, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generates dynamic chart suggestions based on column data types and correlations."""
        suggestions = []
        num_cols = list(df.select_dtypes(include=[np.number]).columns)
        cat_cols = list(df.select_dtypes(exclude=[np.number, 'datetime64']).columns)
        date_cols = list(df.select_dtypes(include=['datetime64']).columns)

        # 1. Correlation heatmap if >= 2 numeric
        if len(num_cols) >= 2:
            suggestions.append({
                "id": "corr_matrix",
                "title": "Correlation Matrix Heatmap",
                "category": "Multivariate",
                "chart_type": "correlation_heatmap",
                "description": "Pairwise linear correlations across all numeric features."
            })

        # 2. Key numeric distributions
        for col in num_cols[:2]:
            suggestions.append({
                "id": f"hist_{col}",
                "title": f"Distribution of {col}",
                "category": "Univariate",
                "chart_type": "histogram",
                "x": col,
                "description": f"Histogram and spread analysis for {col}."
            })

        # 3. Categorical counts
        for col in cat_cols[:2]:
            if df[col].nunique() < 25:
                suggestions.append({
                    "id": f"bar_{col}",
                    "title": f"Frequency of {col}",
                    "category": "Categorical",
                    "chart_type": "bar",
                    "x": col,
                    "description": f"Top category distributions in {col}."
                })

        # 4. Top correlation scatter
        if len(num_cols) >= 2:
            corr_sub = df[num_cols].corr().abs().copy()
            corr_vals = corr_sub.to_numpy(copy=True)
            np.fill_diagonal(corr_vals, 0)
            corr_sub = pd.DataFrame(corr_vals, index=corr_sub.index, columns=corr_sub.columns)
            max_pair = corr_sub.unstack().sort_values(ascending=False).head(1)
            if len(max_pair) > 0:
                c1, c2 = max_pair.index[0]
                suggestions.append({
                    "id": f"scatter_{c1}_{c2}",
                    "title": f"{c1} vs {c2} Scatter",
                    "category": "Bivariate",
                    "chart_type": "scatter",
                    "x": c1,
                    "y": c2,
                    "color": cat_cols[0] if cat_cols else None,
                    "description": f"Strong correlation relationship between {c1} and {c2}."
                })

        # 5. Box plot if numeric and categorical exist
        if num_cols and cat_cols:
            suggestions.append({
                "id": f"box_{cat_cols[0]}_{num_cols[0]}",
                "title": f"{num_cols[0]} grouped by {cat_cols[0]}",
                "category": "Bivariate",
                "chart_type": "box",
                "x": cat_cols[0],
                "y": num_cols[0],
                "description": f"Distribution comparison of {num_cols[0]} across {cat_cols[0]}."
            })

        # 6. PCA 2D if >= 3 numeric features
        if len(num_cols) >= 3:
            suggestions.append({
                "id": "pca_2d",
                "title": "Principal Component Analysis (PCA 2D)",
                "category": "Advanced",
                "chart_type": "pca2d",
                "description": "Dimensionality reduction projecting high-dimensional space into 2 principal components."
            })

        return suggestions
