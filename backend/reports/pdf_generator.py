import os
import io
from typing import Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class PDFReportGenerator:
    @staticmethod
    def generate_analytical_report(dataset, profile_data: Dict[str, Any], quality_data: Dict[str, Any], experiments_data: list) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1e3a8a'),
            spaceAfter=12
        )
        heading2_style = ParagraphStyle(
            'Heading2Style',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#2563eb'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = styles['Normal']

        # Title Section
        story.append(Paragraph("Automated Data Science & ML Executive Report", title_style))
        story.append(Paragraph(f"<b>Dataset:</b> {dataset.name} (Version {dataset.version}) &bull; <b>Generated:</b> {dataset.updated_at.strftime('%Y-%m-%d %H:%M UTC')}", body_style))
        story.append(Spacer(1, 14))

        # 1. Dataset Overview
        story.append(Paragraph("1. Dataset Specification & Health Summary", heading2_style))
        overview = profile_data.get('overview', {})
        overview_table_data = [
            ["Metric", "Value", "Metric", "Value"],
            ["Total Rows", str(overview.get('total_rows', 0)), "Total Columns", str(overview.get('total_columns', 0))],
            ["Duplicate Rows", str(overview.get('duplicate_rows', 0)), "Total Missing Cells", str(overview.get('total_missing_cells', 0))],
            ["Memory Usage", f"{overview.get('memory_usage_mb', 0)} MB", "Format", dataset.file_format.upper()],
            ["Numeric Columns", str(overview.get('numeric_columns_count', 0)), "Categorical Columns", str(overview.get('categorical_columns_count', 0))]
        ]
        t1 = Table(overview_table_data, colWidths=[130, 130, 130, 130])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8fafc'), colors.white]),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t1)
        story.append(Spacer(1, 14))

        # 2. Data Quality Score Breakdown
        story.append(Paragraph("2. Data Quality Assessment Score", heading2_style))
        overall_score = quality_data.get('overall_score', 0)
        grade = quality_data.get('grade', 'N/A')
        status_txt = quality_data.get('status_text', 'N/A')
        story.append(Paragraph(f"<b>Overall Quality Score:</b> {overall_score} / 100 &nbsp;|&nbsp; <b>Grade:</b> {grade} ({status_txt})", body_style))
        story.append(Spacer(1, 6))

        comps = quality_data.get('components', {})
        quality_table_data = [["Dimension", "Score", "Weight", "Assessment Detail"]]
        for k, v in comps.items():
            quality_table_data.append([
                k.replace('_', ' ').title(),
                f"{v.get('score', 0)}%",
                f"{v.get('weight_pct', 0)}%",
                v.get('description', '')
            ])
        t2 = Table(quality_table_data, colWidths=[120, 60, 60, 280])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0fdfa'), colors.white]),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        story.append(t2)
        story.append(Spacer(1, 14))

        # 3. Machine Learning Experiments Benchmark
        if experiments_data:
            story.append(Paragraph("3. Machine Learning Benchmark & Model Comparison", heading2_style))
            ml_table_data = [["Model Algorithm", "Problem Type", "Target", "Primary Metric", "CV Mean", "Time (s)"]]
            for exp in experiments_data[:10]:
                m = exp.metrics
                primary_val = m.get('r2') or m.get('f1') or m.get('accuracy') or 0
                cv_mean = exp.cv_scores.get('mean', 'N/A')
                ml_table_data.append([
                    exp.model_name,
                    exp.problem_type.replace('_', ' ').title(),
                    exp.target_column,
                    str(primary_val),
                    str(cv_mean),
                    f"{exp.training_time_seconds:.2f}"
                ])
            t3 = Table(ml_table_data, colWidths=[140, 90, 90, 80, 60, 60])
            t3.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4338ca')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#eef2ff'), colors.white]),
                ('PADDING', (0, 0), (-1, -1), 5),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
            ]))
            story.append(t3)

        doc.build(story)
        buffer.seek(0)
        return buffer
