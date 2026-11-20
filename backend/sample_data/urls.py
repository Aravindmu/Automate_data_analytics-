from django.urls import path
from .views import LoadCaliforniaHousingView, LoadCustomerChurnView, AvailableSamplesView

urlpatterns = [
    path('available/', AvailableSamplesView.as_view(), name='available-samples'),
    path('load-california-housing/', LoadCaliforniaHousingView.as_view(), name='load-california-housing'),
    path('load-customer-churn/', LoadCustomerChurnView.as_view(), name='load-customer-churn'),
]
