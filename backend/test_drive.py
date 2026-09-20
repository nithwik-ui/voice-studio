import sys
sys.path.append('.')
import asyncio
from api.drive import drive_service

async def main():
    service = drive_service.get_service()
    req = service.files().list(q="mimeType contains 'video/' and trashed=false", fields='files(name, mimeType, modifiedTime)', orderBy='modifiedTime desc', pageSize=20)
    res = await drive_service._execute_with_retry(req)
    print("VIDEO FILES:")
    for f in res.get('files', []):
        print(f"{f['name']} - {f['mimeType']} - {f['modifiedTime']}")

asyncio.run(main())
