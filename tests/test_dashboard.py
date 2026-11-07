import json
import socket
import time
import unittest
import urllib.request

from race_engineer.dashboard import Hub, start_server
from race_engineer.speech import Speaker
from race_engineer.model import Callout


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class DashboardTest(unittest.TestCase):
    def setUp(self):
        self.hub = Hub()
        self.port = free_port()
        self.server = start_server(self.hub, host="127.0.0.1", port=self.port)
        self.base = f"http://127.0.0.1:{self.port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def test_index_and_command(self):
        html = urllib.request.urlopen(self.base + "/").read().decode()
        self.assertTrue(html.startswith("<!doctype html>"))
        self.assertIn("Race", html)
        got = []
        self.hub.on_command = got.append
        req = urllib.request.Request(self.base + "/api/status", method="POST", data=b"")
        self.assertEqual(urllib.request.urlopen(req).status, 204)
        self.assertEqual(got, ["status"])

    def test_event_stream(self):
        self.hub.publish("callout", Callout("Gelbe Flagge", 0).to_dict())
        self.hub.publish("state", {"x": 1})
        resp = urllib.request.urlopen(self.base + "/events", timeout=5)
        lines = [resp.readline().decode().strip() for _ in range(6)]
        resp.close()
        self.assertIn("event: callout", lines)
        data = json.loads(lines[lines.index("event: callout") + 1][6:])
        self.assertEqual(data["text"], "Gelbe Flagge")
        self.assertIn("event: state", lines)


class SpeakerTest(unittest.TestCase):
    def test_disabled_speaker_is_noop(self):
        sp = Speaker(enabled=False)
        sp.say(Callout("Hallo"))
        sp.close()
        self.assertEqual(sp.backend, "aus")


if __name__ == "__main__":
    unittest.main()
