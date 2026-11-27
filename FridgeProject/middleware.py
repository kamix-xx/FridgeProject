class CameraPermissionsMiddleware:
    """
    Injects HTTP headers required for Chrome (and Chromium-based browsers) to
    allow getUserMedia / camera access on mobile.

    Chrome enforces Permissions-Policy and blocks camera by default in certain
    cross-origin-isolated contexts. Without this header Chrome on Android
    silently blocks navigator.mediaDevices.getUserMedia even on HTTPS.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Permissions-Policy'] = 'camera=*, microphone=()'
        return response
