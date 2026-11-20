from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .models import UserProfile
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "User registered successfully",
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            user = authenticate(request, username=username, password=password)
            if user:
                login(request, user)
                # Ensure profile exists
                UserProfile.objects.get_or_create(user=user)
                return Response({
                    "message": "Login successful",
                    "user": UserSerializer(user).data
                })
            return Response({"error": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully"})

class MeView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            UserProfile.objects.get_or_create(user=request.user)
            return Response(UserSerializer(request.user).data)
        # For ease of dev, return default demo user
        user, _ = User.objects.get_or_create(username='demo_scientist', defaults={'email': 'scientist@datascience.ai'})
        UserProfile.objects.get_or_create(user=user)
        return Response(UserSerializer(user).data)
