from django.urls import include, path
from . import research, views

urlpatterns = [
    path('', views.index, name='writing'),
    path('guest/', views.guest, name='guest-writing'),
    path('accounts/', include('allauth.urls')),
    path('api/research/sessions/<uuid:key>/', research.save),
    path('api/research/<str:action>/', research.participant),
    path('api/session/', views.session),
    path('api/profile/', views.profile),
    path('api/account/', views.delete_account),
    path('api/entries/', views.entries),
    path('api/entries/<uuid:key>/', views.entry),
    path('api/images/', views.images),
    path('api/images/<uuid:key>/', views.image_detail),
    path('api/images/<uuid:key>/file/', views.image_file),
    path('api/exercises/<str:exercise_id>', views.exercise),
    path('<path:path>', views.asset),
]
