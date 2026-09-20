# Fruit Slice sound sources

The ten WAV files in this folder are edited mixes of the following CC0 assets.
They are served locally and included in the game's offline cache. No account,
external audio service or runtime download from a third party is required.

| Source | Creator | Original files used | License |
| --- | --- | --- | --- |
| [Swishes Sound Pack](https://opengameart.org/content/swishes-sound-pack) | artisticdude | `swishes.zip`: `swish-10.wav`, `swish-11.wav`, `swish-13.wav` | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| [Crunch sounds (cucumber)](https://opengameart.org/content/crunch-sounds-cucumber) | cogitollc | `crunch_1_0.ogg`, `crunch_2_0.ogg`, `crunch_3_0.ogg` | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| [8 wet squish, slurp impacts](https://opengameart.org/content/8-wet-squish-slurp-impacts) | Independent.nu, submitted by qubodup | `independent_nu_ljudbank-wet_squish_slurp_impacts.7z`: `impactsplat02`, `03`, `05`, `06`, `07` (`.mp3.flac`) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| [Chunky Explosion](https://opengameart.org/content/chunky-explosion) | Joth | `Chunky Explosion.mp3` | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

Source pages and license labels checked on 2026-09-20. CC0 public-domain
waiver text: <https://creativecommons.org/publicdomain/zero/1.0/legalcode>.
Credits are retained here for provenance even though attribution is not required.

## Edits

All sources were decoded to mono 44.1 kHz PCM. Leading silence was trimmed by
5 ms energy windows, retaining 3 ms of attack; DC offset was removed. The mixes
use short attack/release fades, gentle saturation and peak/energy normalization,
and are exported as uncompressed 16-bit WAV for consistent browser decoding.

For variants 1 / 2 / 3, blades are swish 10 / 11 / 13, crunches are cucumber
1 / 2 / 3, and juicy impacts are splat 03 / 02 / 07. Soft impacts use splat
07 / 06 / 05. Blade, crunch, juicy and soft playback speeds during editing are
1.03 / 1.45 / 1.45 / 1.6 respectively.

- `slice-crisp-*.wav` (0.29 s): blade + prominent cucumber crack + quieter wet impact.
- `slice-juicy-*.wav` (0.37 s): blade + prominent wet impact + quieter cucumber crack.
- `slice-soft-*.wav` (0.32 s): lighter blade + soft wet impact + quiet crack.
- `bomb.wav` (1.45 s): explosion onset and body, shortened with a 0.45 s tail fade.

Victory-fruit hits reuse the juicy recordings, with a modest combo pitch rise.
Only the start and victory-stage introduction melodies remain synthesized in
`audio.js`; no synthesized hit or explosion is used.
