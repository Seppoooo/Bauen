"""Live web dashboard (stdlib only). Open http://<pc-ip>:<port> on PC, tablet or phone."""
from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import queue
import socket
import threading

WEB_DIR = Path(__file__).parent / "web"


class Hub:
    """Fan-out of events to all connected browsers."""

    def __init__(self, history: int = 40):
        self._clients: set[queue.Queue] = set()
        self._lock = threading.Lock()
        self._history: list[dict] = []
        self._max_history = history
        self.last_state: dict | None = None
        self.on_command = None          # callback(name) set by main app

    def subscribe(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=200)
        with self._lock:
            self._clients.add(q)
            backlog = list(self._history)
        for item in backlog:
            q.put(("callout", item))
        if self.last_state:
            q.put(("state", self.last_state))
        return q

    def unsubscribe(self, q):
        with self._lock:
            self._clients.discard(q)

    def publish(self, event: str, data: dict):
        if event == "state":
            self.last_state = data
        elif event == "callout":
            with self._lock:
                self._history.append(data)
                del self._history[:-self._max_history]
        with self._lock:
            clients = list(self._clients)
        for q in clients:
            try:
                q.put_nowait((event, data))
            except queue.Full:
                pass        # slow client, skip frame


def _make_handler(hub: Hub):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            if self.path in ("/", "/index.html"):
                body = (WEB_DIR / "index.html").read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif self.path == "/events":
                self._stream()
            else:
                self.send_error(404)

        def do_POST(self):
            if self.path.startswith("/api/") and hub.on_command:
                hub.on_command(self.path[5:])
                self.send_response(204)
                self.end_headers()
            else:
                self.send_error(404)

        def _stream(self):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            q = hub.subscribe()
            try:
                while True:
                    try:
                        event, data = q.get(timeout=15)
                        payload = f"event: {event}\ndata: {json.dumps(data)}\n\n"
                    except queue.Empty:
                        payload = ": ping\n\n"
                    self.wfile.write(payload.encode())
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
                pass
            finally:
                hub.unsubscribe(q)

    return Handler


def lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def start_server(hub: Hub, host: str = "0.0.0.0", port: int = 8080) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), _make_handler(hub))
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, name="dashboard", daemon=True).start()
    return server
