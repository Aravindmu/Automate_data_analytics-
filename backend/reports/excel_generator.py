import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import Dict, Any, List

class ExcelReportGenerator:
    @staticmethod
    def generate_excel_workbook(dataset, profile_data: Dict[str, Any], quality_data: Dict[str, Any], experiments: List[Any]) -> io.BytesIO:
        wb = openpyxl.Workbook()

        # Styles
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        title_font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
        bold_font = Font(name="Calibri", size=11, bold=True)

        # ----------------- Sheet 1: Overview -----------------
        ws1 = wb.active
        ws1.title = "Overview & Quality"
        ws1.append(["Automated Data Science & ML Platform - Dataset Report"])
        ws1.cell(1, 1).font = title_font
        ws1.append([])

        ws1.append(["Dataset Name", dataset.name])
        ws1.append(["Version", dataset.version])
        ws1.append(["Format", dataset.file_format.upper()])
        ws1.append(["Created At", dataset.created_at.strftime('%Y-%m-%d %H:%M UTC')])
        ws1.append([])

        overview = profile_data.get('overview', {})
        ws1.append(["Dataset Overview Metrics", "Value"])
        ws1.cell(ws1.max_row, 1).font = bold_font
        ws1.append(["Total Rows", overview.get('total_rows', 0)])
        ws1.append(["Total Columns", overview.get('total_columns', 0)])
        ws1.append(["Duplicate Rows", overview.get('duplicate_rows', 0)])
        ws1.append(["Total Missing Cells", overview.get('total_missing_cells', 0)])
        ws1.append(["Memory Usage (MB)", overview.get('memory_usage_mb', 0)])
        ws1.append([])

        ws1.append(["Quality Score Breakdown", "Score", "Weight"])
        ws1.cell(ws1.max_row, 1).font = bold_font
        ws1.append(["Overall Quality Score", quality_data.get('overall_score', 0), f"Grade: {quality_data.get('grade')}"])
        for k, v in quality_data.get('components', {}).items():
            ws1.append([k.replace('_', ' ').title(), f"{v.get('score')}%", f"{v.get('weight_pct')}%"])

        # ----------------- Sheet 2: Columns -----------------
        ws2 = wb.create_sheet(title="Column Statistics")
        col_headers = ["Column Name", "Type Group", "Dtype", "Missing Count", "Missing %", "Unique Count", "Mean", "Median", "Std", "Min", "Max", "IQR", "Outliers"]
        ws2.append(col_headers)
        for c in range(1, len(col_headers) + 1):
            cell = ws2.cell(1, c)
            cell.fill = header_fill
            cell.font = header_font

        for col_info in profile_data.get('columns', []):
            st = col_info.get('stats') or {}
            ws2.append([
                col_info.get('name'),
                col_info.get('dtype_group'),
                col_info.get('dtype'),
                col_info.get('missing_count'),
                col_info.get('missing_pct'),
                col_info.get('unique_count'),
                st.get('mean', '-'),
                st.get('median', '-'),
                st.get('std', '-'),
                st.get('min', '-'),
                st.get('max', '-'),
                st.get('iqr', '-'),
                st.get('outliers_count', '-')
            ])

        # ----------------- Sheet 3: ML Experiments -----------------
        if experiments:
            ws3 = wb.create_sheet(title="ML Models Benchmark")
            ml_headers = ["Model Algorithm", "Problem Type", "Target", "Metrics", "CV Mean", "Training Time (s)", "Artifact Path"]
            ws3.append(ml_headers)
            for c in range(1, len(ml_headers) + 1):
                cell = ws3.cell(1, c)
                cell.fill = header_fill
                cell.font = header_font

            for exp in experiments:
                ws3.append([
                    exp.model_name,
                    exp.problem_type,
                    exp.target_column,
                    str(exp.metrics),
                    str(exp.cv_scores.get('mean', '-')),
                    exp.training_time_seconds,
                    exp.artifact_path
                ])

        # Auto-adjust column widths
        for sheet in wb.worksheets:
            for col in sheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = openpyxl.utils.get_column_letter(col[0].column)
                sheet.column_dimensions[col_letter].width = min(max_len + 4, 40)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer
