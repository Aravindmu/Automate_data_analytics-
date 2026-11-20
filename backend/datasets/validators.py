import re
import socket
import ipaddress
from urllib.parse import urlparse

try:
    import charset_normalizer as chardet
except ImportError:
    try:
        import chardet
    except ImportError:
        chardet = None

ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls', '.json', '.parquet'}
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

PRIVATE_IP_NETWORKS = [
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),
    ipaddress.ip_network('::1/128'),
    ipaddress.ip_network('fc00::/7'),
    ipaddress.ip_network('fe80::/10'),
]

def validate_ssrf_url(url: str) -> bool:
    """Ensure the target URL is safe and does not point to internal/private infrastructure."""
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        raise ValueError("Only http and https protocols are supported.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: missing hostname.")

    # Check for localhost / local names
    if hostname.lower() in ('localhost', '127.0.0.1', '0.0.0.0', '::1') or hostname.endswith('.local'):
        raise ValueError("Access to local addresses is restricted.")

    try:
        ip_list = socket.getaddrinfo(hostname, None)
        for item in ip_list:
            ip_str = item[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            for net in PRIVATE_IP_NETWORKS:
                if ip_obj in net:
                    raise ValueError(f"Restricted address: {hostname} resolves to private IP {ip_str}.")
    except socket.gaierror:
        raise ValueError(f"Could not resolve hostname: {hostname}")

    return True

def detect_encoding(file_path: str, num_bytes: int = 65536) -> str:
    """Sniff text encoding safely."""
    try:
        if chardet is not None:
            with open(file_path, 'rb') as f:
                raw = f.read(num_bytes)
            result = chardet.detect(raw)
            return result.get('encoding') or 'utf-8'
        return 'utf-8'
    except Exception:
        return 'utf-8'

def detect_csv_delimiter(file_path: str, encoding: str = 'utf-8') -> str:
    """Sniff CSV delimiter (comma, semicolon, tab, pipe)."""
    try:
        import csv
        with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
            sample = f.read(8192)
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(sample, delimiters=[',', ';', '\t', '|'])
            return dialect.delimiter
    except Exception:
        return ','
