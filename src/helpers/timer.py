#!/usr/bin/env python

import sys
import time as zzz
import argparse

COLORS = {
    "yellow": "\033[1;93m",
    "green": "\033[0;32m",
    "mgnta": "\033[1;94m",
    "white": "\033[1;37m",
    "cyan": "\033[1;96m",
    "red": "\033[1;91m",
    "gray": "\033[90m",
    "off": "\033[0m",
}

def countdown(seconds):
    end_time = zzz.perf_counter() + seconds
    template = f"\r{COLORS['gray']}... timer: {COLORS['white']} --> {COLORS['cyan']}{{hrs:02d}}:{COLORS['mgnta']}{{min:02d}}:{COLORS['yellow']}{{sec:02d}}.{COLORS['red']}{{mlsecs:03d}}{COLORS['off']}"
    while zzz.perf_counter() < end_time:
        remain = round(end_time - zzz.perf_counter(), 3) # <-- round to 3 decimal | for milliseconds cleanup:
        hrs = int(remain // 3600)
        min = int((remain % 3600) // 60)
        sec = int(remain % 60)
        mlsecs = int((remain * 1000) % 1000)
        
        sys.stdout.write(template.format(hrs=hrs, min=min, sec=sec, mlsecs=mlsecs))
        sys.stdout.flush()
        zzz.sleep(0.01)  # <-- loop refresh:

    # ... 00:00:00.000 stdout check:
    sys.stdout.write(f"\r{COLORS['gray']}countdown completed: {COLORS['cyan']}00:{COLORS['mgnta']}00:{COLORS['yellow']}00.{COLORS['red']}000{COLORS['off']}")
    sys.stdout.flush()
    print(COLORS['off'])

def main():
    parser = argparse.ArgumentParser(description="Countdown timer.")
    parser.add_argument("seconds", type=int, nargs="?", default=5, help="Countdown time in seconds (default: 5).")
    args = parser.parse_args()

    if args.seconds < 1:
        print(f"\t{COLORS['red']}Sys.arg Error:{COLORS['off']} Countdown must be at least {COLORS['yellow']}1 {COLORS['off']}second.\n")
    else:
        countdown(args.seconds)

if __name__ == "__main__":
    main()
    # countdown(int(sys.argv[1]))