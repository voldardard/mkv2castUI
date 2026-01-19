"""
URL configuration for mkv2cast_api project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static

# Language prefixes for API routes
LANG_PREFIX = r'^(?P<lang>fr|en|de|it|es)/'

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API routes without language prefix
    path('api/', include('conversions.urls')),
    path('api/auth/', include('accounts.urls')),
    
    # API routes with language prefix (fr, en, de, it, es)
    re_path(LANG_PREFIX + r'api/', include('conversions.urls')),
    re_path(LANG_PREFIX + r'api/auth/', include('accounts.urls')),
    
    # Django Allauth
    path('accounts/', include('allauth.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
