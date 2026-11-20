from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from datasets.serializers import DatasetSerializer
from .generator import SampleDataGenerator

class LoadCaliforniaHousingView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            dataset = SampleDataGenerator.load_california_housing()
            return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Failed to load sample dataset: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoadCustomerChurnView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            dataset = SampleDataGenerator.load_customer_churn()
            return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Failed to load sample dataset: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AvailableSamplesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response([
            {
                "id": "california_housing",
                "title": "California Housing Prices",
                "problem_type": "regression",
                "target_column": "MedianHouseValue",
                "description": "Standard benchmark with 20,640 records containing median home values, geographic coordinates, and census demographics.",
                "features_count": 8,
                "rows_count": 20640,
                "endpoint": "/api/samples/load-california-housing/"
            },
            {
                "id": "customer_churn",
                "title": "Bank Customer Churn",
                "problem_type": "binary_classification",
                "target_column": "Exited",
                "description": "2,500 bank customer accounts with CreditScore, Geography, Balance, Products, and Churn status indicator.",
                "features_count": 10,
                "rows_count": 2500,
                "endpoint": "/api/samples/load-customer-churn/"
            }
        ])
