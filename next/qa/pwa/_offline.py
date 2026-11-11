"""The real network cut shared by the offline PWA checks (offline_reload.py, pwa.py check_offline and check_packoffline).

context.set_offline(True) alone is NOT enough: it takes the page offline, but the service worker's own fetch() still
reaches the network (measured 2026-11-10 with Playwright 1.60: 382 server hits after set_offline), so a worker that fell
through to the network would pass. So the cut is real as well:

  - locally the gzip server (pwa.Handler) drops every request with no answer once Cut.offline is set, and lists them;
  - with a Tunnel (offline_reload.py --live) the browser runs through a local CONNECT proxy (TLS bytes passed through
    untouched) that closes every tunnel and refuses new ones.

cut() also clears the browser's HTTP cache first (Cache Storage stays): GitHub Pages answers with max-age=600, so for ten
minutes a worker cache miss would still be served from the HTTP cache offline. A player back the next day has no such help.

probe() then fetches a pack file no cache can hold: the worker must answer 503, which proves it saw no network.
restore() turns the local server back on, for scripts that run more checks on the same server afterwards.
"""
import select
import socket
import socketserver
import threading

# A pack-shaped name (ep6_ prefix: the worker's 'pack' route) that is never on disk and never cached. Offline the worker
# can only answer it with its own 503; online the server would answer 404.
PROBE_MARK = '/ep6_offline_probe_'
PROBE_JS = """async () => { const u = new URL('assets/ui/ep6_offline_probe_' + Date.now() + '.json', location.href).href;
  try { const r = await fetch(u, { cache: 'no-store' }); return { status: r.status, sw: !!navigator.serviceWorker.controller }; }
  catch (e) { return { status: 'fetch failed: ' + e, sw: !!navigator.serviceWorker.controller }; } }"""


class Cut:
    """The network switch. offline=True makes the local server refuse and the tunnel close; refused lists what tried."""
    offline = False
    refused = []


def install_local_cut(handler_cls):
    """Wrap handler_cls.do_GET: once Cut.offline, every request (keep-alive sockets included) is dropped with no answer.
    Pass the class the server really runs (pwa.py run as a script is __main__.Handler, not pwa.Handler). Idempotent."""
    if getattr(handler_cls, '_lq_cut_installed', False):
        return
    orig = handler_cls.do_GET

    def do_get(self):
        if Cut.offline:
            Cut.refused.append(self.path)
            self.close_connection = True
            return                      # no status line: the browser sees a network error (ERR_EMPTY_RESPONSE)
        return orig(self)
    handler_cls.do_GET = do_get
    handler_cls._lq_cut_installed = True


class Tunnel(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """A CONNECT-only proxy on 127.0.0.1 for --live: passes TLS bytes through untouched; cut() closes every tunnel."""
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self):
        self.socks = set()
        self.lock = threading.Lock()
        super().__init__(('127.0.0.1', 0), TunnelHandler)

    def cut(self):
        Cut.offline = True
        with self.lock:
            for sk in list(self.socks):
                try:
                    sk.close()
                except OSError:
                    pass
            self.socks.clear()


class TunnelHandler(socketserver.BaseRequestHandler):
    def handle(self):
        c = self.request
        up = None
        c.settimeout(20)
        try:
            head = b''
            while b'\r\n\r\n' not in head and len(head) < 8192:
                chunk = c.recv(4096)
                if not chunk:
                    return
                head += chunk
            line = head.split(b'\r\n', 1)[0].decode('latin1')
            parts = line.split()
            if Cut.offline or len(parts) < 2 or parts[0] != 'CONNECT':
                Cut.refused.append(line)
                return
            host, port = parts[1].rsplit(':', 1)
            up = socket.create_connection((host, int(port)), timeout=20)
            with self.server.lock:
                self.server.socks.update((c, up))
            c.sendall(b'HTTP/1.1 200 Connection Established\r\n\r\n')
            c.settimeout(None)
            up.settimeout(None)
            pair = {c: up, up: c}
            while not Cut.offline:
                r, _, _ = select.select(list(pair), [], [], 1.0)
                for sk in r:
                    data = sk.recv(65536)
                    if not data:
                        return
                    pair[sk].sendall(data)
        except (OSError, ValueError):
            return
        finally:
            for sk in (c, up):
                if sk is not None:
                    try:
                        sk.close()
                    except OSError:
                        pass


def cut(ctx, page, tunnel=None):
    """Clear the HTTP cache, take the context offline, then really cut: the tunnel closes, or the local server refuses."""
    cdp = ctx.new_cdp_session(page)
    cdp.send('Network.clearBrowserCache')
    cdp.detach()
    ctx.set_offline(True)
    if tunnel:
        tunnel.cut()
    else:
        Cut.offline = True


def restore():
    """The local server answers again and the refused list starts empty (the browser context is the caller's to close)."""
    Cut.offline = False
    Cut.refused = []


def probe(page):
    """Fetch the uncacheable probe through the worker. {'status': 503, ...} means the worker saw no network."""
    return page.evaluate(PROBE_JS)


def probe_ok(result):
    return bool(result) and result.get('status') == 503


# Sabotage for proving a check can fail (pwa.py --sabotage): run in the page right before cut().
# The worker then misses and falls through to fetch(); only a real cut stops that fetch (set_offline does not).
DROP_CACHES_JS = """async (prefix) => { const names = (await caches.keys()).filter((n) => n.startsWith(prefix));
  for (const n of names) await caches.delete(n); return names; }"""
DROP_ENTRIES_JS = """async ([name, files]) => { const c = await caches.open(name); let n = 0;
  for (const r of await c.keys()) { const p = new URL(r.url).pathname; if (files.some((f) => p.endsWith('/next/' + f))) { await c.delete(r); n++; } }
  return n; }"""
