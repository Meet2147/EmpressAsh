"""Pick the currency from where the visitor is: INR in India, USD everywhere else."""
import ipaddress
import logging

from fastapi import Request

log = logging.getLogger("empressash")

try:  # Offline IPv4 + IPv6 country database bundled with the package (no network calls).
    from geoip2fast import GeoIP2Fast
    _db = GeoIP2Fast(geoip2fast_data_file="geoip2fast-ipv6.dat.gz")
except Exception as e:  # never stop the site from starting
    log.warning("Country lookup unavailable (%s); falling back to the visitor's time zone.", e)
    _db = None


def country(request: Request) -> str | None:
    """Two-letter country code, or None if it can't be told (e.g. local testing)."""
    cf = request.headers.get("cf-ipcountry", "").upper()  # set if the domain is behind Cloudflare
    if len(cf) == 2 and cf.isalpha() and cf != "XX":
        return cf
    ip = request.client.host if request.client else ""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return None
    if _db is None or not addr.is_global:
        return None
    try:
        code = _db.lookup(ip).country_code
    except Exception:
        return None
    return code if code and len(code) == 2 and code.isalpha() else None


def currency(request: Request) -> str | None:
    """'inr' for India, 'usd' elsewhere, None when the location is unknown."""
    c = country(request)
    if c is None:
        return None
    return "inr" if c == "IN" else "usd"
