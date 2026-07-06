#!/usr/bin/env python3
"""Simple LAN directory sharing server.

Usage:
  python3 lan_share.py --dir /path/to/share --port 8000
"""

from __future__ import annotations

import argparse
import http.server
import os
import socket
import socketserver
from pathlib import Path


def get_local_ip() -> str:
    """Best-effort local IP for LAN access display."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Share a local directory over LAN")
    parser.add_argument(
        "--dir",
        default=".",
        help="Directory to share (default: current directory)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to listen on (default: 8000)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    share_dir = Path(args.dir).expanduser().resolve()

    if not share_dir.exists() or not share_dir.is_dir():
        raise SystemExit(f"Invalid directory: {share_dir}")

    os.chdir(share_dir)

    handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer(("0.0.0.0", args.port), handler) as httpd:
        local_ip = get_local_ip()
        print("\\nLAN directory sharing started")
        print(f"Sharing directory: {share_dir}")
        print(f"Local access:   http://127.0.0.1:{args.port}")
        print(f"LAN access:     http://{local_ip}:{args.port}")
        print("Press Ctrl+C to stop.\\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\\nStopped.")


if __name__ == "__main__":
    main()
