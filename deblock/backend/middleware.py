from django.http import JsonResponse


class ResponseSecurityMiddleware:
    """Same-origin UI, no framing, and no cached account responses."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.get_host()  # Validate hosts even for views which never build a URL.
        length = request.META.get('CONTENT_LENGTH', '')
        if length and (not length.isdigit() or int(length) > 10 * 1024 * 1024):
            response = JsonResponse({'error': 'Request too large.'}, status=413)
        else:
            response = self.get_response(request)
        response['Content-Security-Policy'] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; "
            "connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
        )
        response['Cache-Control'] = 'no-store'
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response
