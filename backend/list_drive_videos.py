import os
from api.drive import drive_service

service = drive_service.get_service()
q = "mimeType contains 'video/' and trashed = false"
res = service.files().list(q=q, spaces='drive', fields='files(id, name, mimeType, size, modifiedTime)', pageSize=20).execute()
files = res.get('files', [])
print(f"Found {len(files)} video files in Google Drive:")
for f in files:
    size_mb = round(int(f.get('size', 0)) / (1024*1024), 2)
    print(f"  - {f['name']} (ID: {f['id']}, Size: {size_mb} MB)")
