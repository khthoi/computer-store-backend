"""
Upload seed images to Cloudinary via the admin media API.
Run: python scripts/upload-seeds.py
"""
import requests
import json
import os
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

API_BASE = "http://localhost:4000/api"
SEEDS_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'seeds')

# Login
def login():
    r = requests.post(f"{API_BASE}/auth/admin/login", json={"email": "admin@pcstore.vn", "matKhau": "Admin@123"})
    r.raise_for_status()
    return r.json()["data"]["accessToken"]

# Upload a single file
def upload(token: str, filepath: str, folder: str) -> dict:
    with open(filepath, "rb") as f:
        filename = os.path.basename(filepath)
        mime = "image/jpeg" if filepath.lower().endswith(".jpg") else "image/png"
        r = requests.post(
            f"{API_BASE}/admin/media/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": (filename, f, mime)},
            data={"folder": folder},
        )
    if r.status_code != 201:
        print(f"  ERROR {r.status_code}: {r.text[:200]}")
        return None
    return r.json()

# Image → folder mapping
IMAGE_FOLDERS = {
    # CPUs
    "CPU AMD R5 5600X Full Box.jpg":             "pc-store/products/cpu",
    "CPU AMD R7 7800X3D Full Box.jpg":           "pc-store/products/cpu",
    "CPU AMD R9 9950X3D Full Box.jpg":           "pc-store/products/cpu",
    "CPU Intel Core i5 12400F Full Box.jpg":     "pc-store/products/cpu",
    "CPU Intel Core i7 12700F Full Box.jpg":     "pc-store/products/cpu",
    "CPU Intel Core i9 14900K Full Box.jpg":     "pc-store/products/cpu",
    # Mainboards
    "ASUS TUF GAMING B760 WIFI DDR5.jpg":        "pc-store/products/mainboard",
    "ASUS TUF GAMING Z790 PLUS WIFI D5.jpg":     "pc-store/products/mainboard",
    "Mainboard ASUS ROG STRIX X870-F GAMING WIFI.jpg":  "pc-store/products/mainboard",
    "Mainboard ASUS TUF GAMING B550M-PLUS WIFI II.jpg": "pc-store/products/mainboard",
    "Mainboard Gigabyte X870 AORUS ELITE WIFI7.jpg":    "pc-store/products/mainboard",
    # GPUs
    "RTX 4060 MSI.png":                          "pc-store/products/gpu",
    "RTX 4070 Asus DUAL 2 FANs.jpg":             "pc-store/products/gpu",
    "RTX 4070 ASUS TUF GAMING 12GB 3 FANs.png":  "pc-store/products/gpu",
    "RTX 4080 ASUS TUF GAMING 16GB 3 FANs.png":  "pc-store/products/gpu",
    "RTX 4090 ASUS ROG STRIX 24GB OC 3 FANs.png":"pc-store/products/gpu",
    # RAM
    "RAM Desktop Kingston Fury Beast DDR4 3200MHz.jpg":          "pc-store/products/ram",
    "RAM Desktop Kingston Fury Beast RGB 32GB (2x16GB) DDR5 5600MHz.jpg": "pc-store/products/ram",
    # Storage
    "Ổ Cứng SSD Samsung 990 Pro 2TB – M.2 2280 PCIe Gen4 x4.jpg": "pc-store/products/storage",
    # PSU
    "Nguồn ASUS ROG THOR 1600W Titanium III - 1600W.jpg":        "pc-store/products/psu",
    # Case
    "Vỏ case Lian Li A3 - White Wood.jpg":       "pc-store/products/case",
    # Laptops
    "Laptop Acer Predator Helios Neo 16 AI PHN16-73-757W (NH.QVQSV.001).jpg": "pc-store/products/laptop",
    "Laptop Acer Predator Helios Neo PHN14-51-99Y8 (NH.QRPSV.001).jpg":       "pc-store/products/laptop",
    "Laptop Asus Gaming ROG Strix G614PH-S5101W.jpg":  "pc-store/products/laptop",
    "Laptop Asus Gaming ROG Strix G615LR-S5289W.jpg":  "pc-store/products/laptop",
    "Laptop Asus ZenBook UM3406GA-QD073WS.jpg":        "pc-store/products/laptop",
    "Laptop Lenovo Gaming Legion 5 15AHP11 83Q7001JVN.jpg": "pc-store/products/laptop",
}

def main():
    print("Logging in...")
    token = login()
    print(f"Token obtained.\n")

    results = {}
    for filename, folder in IMAGE_FOLDERS.items():
        filepath = os.path.join(SEEDS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"MISSING: {filename}")
            continue

        print(f"Uploading [{folder}] {filename}...")
        data = upload(token, filepath, folder)
        if data:
            asset = data.get("data") or data
            results[filename] = {
                "asset_id":      asset.get("id") or asset.get("asset_id"),
                "cloudinary_id": asset.get("cloudinaryId") or asset.get("cloudinary_id"),
                "url":           asset.get("urlGoc") or asset.get("url_goc"),
                "folder":        folder,
            }
            print(f"  OK asset_id={results[filename]['asset_id']}  url={results[filename]['url'][:60]}...")

    # Save mapping
    out = os.path.join(os.path.dirname(__file__), 'upload-mapping.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nDone! {len(results)}/{len(IMAGE_FOLDERS)} uploaded. Mapping saved to {out}")

if __name__ == "__main__":
    main()
