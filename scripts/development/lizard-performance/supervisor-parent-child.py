"""Fixture: a direct target reaps one CPU-active child before supervisor wait4 observes it."""
import subprocess
import sys

child = subprocess.Popen([sys.executable, "-c", "sum(index * index for index in range(300000))"])
child.wait()
sum(index * index for index in range(300000))
