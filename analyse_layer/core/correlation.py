"""Stateful correlation of authentication events into attack campaigns."""

from collections import deque
from datetime import datetime, timedelta, timezone
from hashlib import sha256


class BruteForceCorrelator:
    """Groups failed logins by attacker, target service and a rolling window.

    A honeypot produces one event per password attempt.  This class keeps that
    audit trail intact while exposing one campaign when enough related failed
    logins have been observed.
    """

    def __init__(self, window_seconds=300, threshold=5):
        self.window = timedelta(seconds=window_seconds)
        self.threshold = threshold
        self.campaigns = {}

    @staticmethod
    def is_login_attempt(log):
        event_type = str(log.get("event_type") or "").lower()
        extra = log.get("extra_info") or {}
        return "login" in event_type or "password" in extra or "credentials" in extra

    @staticmethod
    def _timestamp(log):
        value = log.get("timestamp")
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            return datetime.now(timezone.utc)

    @staticmethod
    def _key(log):
        return (
            log.get("source_ip"),
            log.get("honeypot"),
            str(log.get("protocol") or "unknown").lower(),
            str(log.get("dst_port") or "unknown"),
        )

    def observe(self, log):
        """Add one login event and return its campaign state, or ``None``."""
        if not self.is_login_attempt(log):
            return None

        now = self._timestamp(log)
        key = self._key(log)
        events = self.campaigns.setdefault(key, deque())
        events.append((now, log))
        cutoff = now - self.window
        while events and events[0][0] < cutoff:
            events.popleft()

        count = len(events)
        # The first event separates a new campaign from a later attack by the
        # same source against the same service after the rolling window closes.
        campaign_material = "|".join(key) + "|" + events[0][0].isoformat()
        campaign_id = sha256(campaign_material.encode()).hexdigest()[:16]
        # A predictable, volume-based score: threshold starts at 75 and grows
        # as the attacker persists, without relying on a per-log ML score.
        risk_score = min(99, 75 + max(0, count - self.threshold) * 3) if count >= self.threshold else 0
        return {
            "campaign_id": f"bf-{campaign_id}",
            "key": key,
            "event_count": count,
            "events": [event for _, event in events],
            "risk_score": risk_score,
            "is_brute_force": count >= self.threshold,
        }
