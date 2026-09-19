from core.normalizer import LogNormalizer
from core.processing import _window_evidence


def test_cowrie_download_shasum_is_a_file_hash():
    normalized = LogNormalizer().normalize({
        "honeypot_source": "cowrie",
        "eventid": "cowrie.session.file_download",
        "src_ip": "192.0.2.1",
        "shasum": "abc123",
    })

    assert normalized["extra_info"]["file_hash"] == "abc123"
    assert normalized["extra_info"]["file_hash_type"] == "sha256"
    assert "tty_hash" not in normalized["extra_info"]


def test_cowrie_tty_shasum_is_not_a_file_hash():
    normalized = LogNormalizer().normalize({
        "honeypot_source": "cowrie",
        "eventid": "cowrie.log.closed",
        "src_ip": "192.0.2.1",
        "shasum": "tty123",
    })

    assert normalized["extra_info"]["tty_hash"] == "tty123"
    assert "file_hash" not in normalized["extra_info"]


def test_dionaea_hash_alias_is_normalized():
    normalized = LogNormalizer().normalize({
        "honeypot_source": "dionaea",
        "src_ip": "192.0.2.2",
        "sha256_hash": "def456",
    })

    assert normalized["extra_info"]["file_hash"] == "def456"
    assert normalized["extra_info"]["file_hash_type"] == "sha256"


def test_evidence_is_found_in_the_whole_window():
    logs = [
        {"extra_info": {"file_hash": "captured-file"}},
        {"extra_info": {}},
    ]

    assert _window_evidence(logs, "file_hash") == "captured-file"
    assert _window_evidence(logs, "tty_hash") == "N/A"
