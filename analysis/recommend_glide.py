#!/usr/bin/env python3
"""Stable launcher for the glide-path recommendation CLI."""

import os
import sys

# Running a file inside analysis/ puts that directory, rather than the repo root,
# on sys.path. Add the root so the canonical analysis package imports resolve.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.glide_path.cli import main


if __name__ == "__main__":
    main()
