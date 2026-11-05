"""R.13: visitors start writing and can opt into an account later."""
from django.test import Client


def test_home_opens_guest_writer_instead_of_sign_in():
    response = Client().get('/')
    assert response.status_code == 302
    assert response.url == '/guest/'
    page = Client().get('/', follow=True)
    assert page.status_code == 200
    assert b'id="word"' in page.content
    assert b'id="guest-sign-up"' in page.content
    assert b'href="/accounts/signup/"' in page.content
