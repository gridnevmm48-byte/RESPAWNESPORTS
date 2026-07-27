#!/usr/bin/env python3
"""Static server for local preview.

`python3 -m http.server` evaluates os.getcwd() while building its argument
parser, which fails outright when the process starts in a directory it is not
allowed to stat. Changing directory first sidesteps that.
"""
import functools
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8823))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT),
                            functools.partial(Handler, directory=ROOT)) as httpd:
    print(f"serving {ROOT} on http://localhost:{PORT}", flush=True)
    httpd.serve_forever()
