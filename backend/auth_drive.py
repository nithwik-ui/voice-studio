import os
import sys
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata']

def main():
    if not os.path.exists('client_secret.json'):
        print("client_secret.json not found!")
        sys.exit(1)
        
    flow = InstalledAppFlow.from_client_secrets_file('client_secret.json', SCOPES)
    
    # We run the local server. The user will be prompted to open the URL in their browser.
    # The browser will redirect back to localhost:8080 with the code.
    creds = flow.run_local_server(port=8080, open_browser=False)
    
    # Save the credentials for the next run
    with open('token.json', 'w') as token:
        token.write(creds.to_json())
        
    print("\nAuthentication successful! token.json saved. You can now use the app.")

if __name__ == '__main__':
    main()
