# Building: Website illustration

The prism-produce skill's build, check and delivery notes for this format (sections 2 and 3); read only for a piece that has it.

## Build

- illustration: `.prism-kit/run.sh illustration formats/illustration.md out/illustration` (`<tag>-dark.html` and `<tag>-light.html`, the single HTML block for the site; `<tag>-bench.html`, the live preview; finished-frame PNGs at desktop and phone width and a `-frames.png` strip of the motion). It prints `[illustration]` warnings and errors (colored fills, anything past the tile or cut off, small type on a phone, words the brand never uses, an animation that doesn't end on the markup's frame, plays early or runs long); fix each in the format file and rebuild. Several illustrations for one page: also `.prism-kit/run.sh illustration bench out/<tag>-bench.html formats/a.md formats/b.md` in page order (neighbors on the same ground stop it).

## Deliver: what each file is for

- illustration: `<tag>-dark.html` / `-light.html` is the block to paste into the site page (an HTML block), as it is; it uses the site's GSAP and ScrollTrigger. The bench is the preview only, with its own copy of GSAP;
