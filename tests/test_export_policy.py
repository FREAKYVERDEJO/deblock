"""R.12: permit the pinned exporter's stylesheet without enabling arbitrary inline code."""
import base64
import hashlib

from django.test import Client


def test_export_stylesheet_is_allowed_but_inline_code_is_not():
    rule = '{\n    content: "" !important;\n    display: none !important;\n}'
    css = f'.___html2canvas___pseudoelement_before:before{rule}\n         .___html2canvas___pseudoelement_after:after{rule}'
    digest = base64.b64encode(hashlib.sha256(css.encode()).digest()).decode()
    policy = Client().get('/style.css')['Content-Security-Policy']
    assert f"'sha256-{digest}'" in policy
    assert "script-src 'self';" in policy
    assert "'unsafe-inline'" not in policy
    assert "object-src 'none'" in policy
