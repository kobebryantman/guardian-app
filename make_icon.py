import struct, zlib

w = h = 32
img = []
for r in range(h):
    for c in range(w):
        dist = ((r-16)**2 + (c-16)**2)
        if dist <= 196:
            img.extend([0x4f, 0x8e, 0xf7, 255])
        else:
            img.extend([0, 0, 0, 0])

rows = [bytes([0] + img[r*w*4:(r+1)*w*4]) for r in range(h)]
idat = zlib.compress(b''.join(rows))
sig = b'\x89PNG\r\n\x1a\n'

def chunk(t, d):
    ln = struct.pack('>I', len(d))
    crc = struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return ln + t + d + crc

ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
data = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

with open(r'd:\明年计设\guardian-app\src\renderer\icon.png', 'wb') as f:
    f.write(data)

print('icon created', len(data), 'bytes')
