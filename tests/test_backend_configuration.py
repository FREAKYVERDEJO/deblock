"""Production must fail closed instead of inheriting development shortcuts."""
import os
import subprocess
import sys


def production_environment(tmp_path):
    env = {key: value for key, value in os.environ.items() if not key.startswith(('DEBLOCK_', 'DJANGO_', 'EMAIL_', 'DATABASE_URL', 'REDIS_URL', 'DEFAULT_FROM_EMAIL'))}
    env.update(DEBLOCK_ENV='production', DEBLOCK_DATA_DIR=str(tmp_path),
        DJANGO_SECRET_KEY='Test-only-production-secret-' * 4,
        DEBLOCK_ORIGIN='https://writing.example.test',
        DATABASE_URL='postgresql://test:test@db.example.test/deblock',
        REDIS_URL='rediss://test:test@cache.example.test:6379/0',
        EMAIL_HOST='smtp.example.test', EMAIL_HOST_USER='test', EMAIL_HOST_PASSWORD='test',
        DEFAULT_FROM_EMAIL='deblock@example.test')
    return env


def test_production_security_checks(tmp_path):
    result = subprocess.run([sys.executable, 'manage.py', 'check', '--deploy', '--fail-level', 'WARNING'],
        env=production_environment(tmp_path), capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
    assert 'no issues' in result.stdout


def test_missing_secret_and_http_origin_cannot_start(tmp_path):
    env = production_environment(tmp_path)
    env.pop('DJANGO_SECRET_KEY')
    missing = subprocess.run([sys.executable, 'manage.py', 'check'], env=env, capture_output=True, text=True)
    assert missing.returncode != 0 and 'DJANGO_SECRET_KEY' in missing.stderr
    env = production_environment(tmp_path)
    env['DEBLOCK_ORIGIN'] = 'http://writing.example.test'
    insecure = subprocess.run([sys.executable, 'manage.py', 'check'], env=env, capture_output=True, text=True)
    assert insecure.returncode != 0 and 'HTTPS origin' in insecure.stderr
