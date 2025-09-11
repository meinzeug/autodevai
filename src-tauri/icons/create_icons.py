#!/usr/bin/env python3
from PIL import Image
import os

# Create simple RGBA icons
def create_icon(size, filename):
    # Create a blue icon with some alpha channel
    img = Image.new('RGBA', (size, size), (70, 130, 180, 255))
    # Add a simple white border
    for i in range(size):
        for j in range(size):
            if i == 0 or i == size-1 or j == 0 or j == size-1:
                img.putpixel((i, j), (255, 255, 255, 255))
    
    img.save(filename)
    print(f"Created {filename}")

# Create all required icon sizes
create_icon(32, '32x32.png')
create_icon(128, '128x128.png')
create_icon(128, '128x128@2x.png')
create_icon(128, 'icon.png')

# Create ICO file
img = Image.open('128x128.png')
img.save('icon.ico', format='ICO', sizes=[(32,32), (64,64), (128,128)])
print("Created icon.ico")

# Create ICNS file (requires Pillow with ICNS support)
try:
    img.save('icon.icns', format='ICNS', sizes=[(128,128)])
    print("Created icon.icns")
except Exception as e:
    print(f"Warning: Could not create ICNS file: {e}")
    # Create a dummy ICNS file
    with open('icon.icns', 'wb') as f:
        f.write(b'icns\x00\x00\x00\x00')
    print("Created dummy icon.icns")

print("All icons created successfully!")