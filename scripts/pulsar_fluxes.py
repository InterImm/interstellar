"""Collect published flux-density measurements for the pulsar lab's pulsars.

The measurements come from the catalogue_papers YAML files shipped with pulsar_spectra
(Swainston et al. 2022, MIT licence, https://github.com/NickSwainston/pulsar_spectra), which gathers
flux densities from the literature. Run it on an unpacked pulsar_spectra wheel:

    python3 scripts/pulsar_fluxes.py path/to/pulsar_spectra/catalogue_papers > lib/pulsar-fluxes.json
"""
import glob
import json
import os
import sys

import yaml

PULSARS = [
    'J0534+2200', 'J0835-4510', 'J1921+2153', 'J0332+5434', 'J0437-4715', 'J1909-3744', 'J1939+2134',
    'J0737-3039A', 'J1915+1606', 'J0953+0755', 'J1300+1240', 'J2144-3933', 'J1713+0747',
]


def main(folder):
    out = {p: [] for p in PULSARS}
    for path in sorted(glob.glob(os.path.join(folder, '*.yaml'))):
        paper = os.path.basename(path)[:-5]
        with open(path) as f:
            data = yaml.safe_load(f)
        for p in PULSARS:
            if p not in data:
                continue
            d = data[p]
            for f_mhz, s_mjy in zip(d['Frequency MHz'], d['Flux Density mJy']):
                if f_mhz > 0 and s_mjy > 0:
                    out[p].append([round(float(f_mhz), 1), round(float(s_mjy), 4), paper])
    for p in out:
        out[p].sort()
    json.dump({'source': 'pulsar_spectra catalogue_papers (Swainston et al. 2022)', 'fluxes': out}, sys.stdout,
              separators=(',', ':'))
    sys.stdout.write('\n')


if __name__ == '__main__':
    main(sys.argv[1])
