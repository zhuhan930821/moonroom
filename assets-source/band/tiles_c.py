from PIL import Image
im = Image.open('/Users/hanzhu/moonroom/assets-source/band/band-memories-c.png').convert('RGB')
W, H = im.size; cols, rows = 3, 2
for r in range(rows):
    for c in range(cols):
        x0, y0, x1, y1 = round(c * W / cols), round(r * H / rows), round((c + 1) * W / cols), round((r + 1) * H / rows)
        im.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3)).save(f'/Users/hanzhu/moonroom/public/assets/band/memories/c{r * cols + c + 1:02d}.webp', 'WEBP', quality=82, method=6)
print(im.size)
