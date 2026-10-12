#!/usr/bin/env python3
"""Photo metadata: strips location and camera data from JPEG bytes without re-encoding, and finds GPS data left in a file.
Used by tidy_pdf.py (every JPEG Chromium passes into a PDF) and verify.py (no exported file may carry GPS data)."""
import io, re

# APP1 is Exif and XMP, APP13 is IPTC (Photoshop). APP0 (JFIF), APP2 (colour profile) and APP14 (Adobe colour transform) stay.
DROP = {0xE1, 0xED}


def strip_jpeg(data):
    """The JPEG without its Exif, XMP and IPTC segments; the image data is untouched. Returns the input when nothing is dropped."""
    if data[:2] != b"\xff\xd8": return data
    out, i, n, dropped = [data[:2]], 2, len(data), False
    while i + 4 <= n and data[i] == 0xFF:
        marker = data[i + 1]
        # Fill byte before a marker.
        if marker == 0xFF: out.append(data[i:i + 1]); i += 1; continue
        # Start of scan: the rest is image data.
        if marker == 0xDA: break
        size = int.from_bytes(data[i + 2:i + 4], "big")
        if marker in DROP: dropped = True
        else: out.append(data[i:i + 2 + size])
        i += 2 + size
    return b"".join(out) + data[i:] if dropped else data


def gps_in(data):
    """True when the bytes hold GPS data: an Exif block with a GPS section, or XMP GPS fields."""
    if re.search(rb"GPS(Latitude|Longitude)", data): return True
    from PIL import Image
    for m in re.finditer(rb"Exif\x00\x00(II\*\x00|MM\x00\*)", data):
        ex = Image.Exif()
        try:
            ex.load(data[m.start():m.start() + 65536])
            if ex.get_ifd(0x8825): return True
        except Exception:
            continue
    return False


def gps_in_image(data):
    """As gps_in, plus PNG and WebP Exif chunks, which carry no Exif header."""
    if gps_in(data): return True
    from PIL import Image
    try: return bool(Image.open(io.BytesIO(data)).getexif().get_ifd(0x8825))
    except Exception: return False
