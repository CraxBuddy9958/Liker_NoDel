import requests
import json
import os
import time

# Configuration
DB_URL = "https://craxlinks-bb690-default-rtdb.firebaseio.com/links.json"
USED_LINKS_FILE = "used_links.json"
# Updated domain as requested
DOMAIN_EXCLUSION = "craxpro.to" 

def load_used_links():
    """Loads the list of used links from a local JSON file."""
    if os.path.exists(USED_LINKS_FILE):
        try:
            with open(USED_LINKS_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []

def save_used_links(used_links):
    """Saves the list of used links to a local JSON file."""
    try:
        with open(USED_LINKS_FILE, 'w') as f:
            json.dump(used_links, f, indent=2)
    except IOError as e:
        print(f"[Step1] Error saving history: {e}")

def process_link():
    print("[Step1] Starting process...")
    
    # 1. Load history
    used_links = load_used_links()
    
    try:
        # 2. Fetch links from Firebase
        response = requests.get(DB_URL)
        if response.status_code != 200:
            print(f"[Step1] Failed to fetch DB. Status: {response.status_code}")
            return

        # 3. Parse data
        # The JS code used response.json() then trim().split()
        # This implies the data is a large string of links separated by whitespace.
        data = response.json()
        
        # Handle cases where data might be a string or a list
        if isinstance(data, str):
            links = data.strip().split()
        elif isinstance(data, list):
            links = data
        else:
            print("[Step1] Unexpected data format from DB.")
            return

        if not links:
            print("[Step1] No links found in DB.")
            return

        # 4. Find the first unused link
        target_link = None
        for link in links:
            # Logic: Skip if already used
            if link not in used_links:
                # Logic: Check for domain exclusion (converted from JS)
                # JS was: if (window.location.href.includes("craxpro.io")) return;
                # In Python bot context, we usually want to SKIP processing these links
                # if they match the exclusion domain, or skip if the CURRENT environment matches.
                # Assuming you want to skip links containing 'craxpro.to' based on your prompt:
                if DOMAIN_EXCLUSION in link:
                    print(f"[Step1] Skipping excluded domain link: {link}")
                    # Optionally mark as used so we don't check it again? 
                    # used_links.append(link) # Uncomment if you want to permanently skip these
                    continue
                
                target_link = link
                break
        
        if not target_link:
            print("[Step1] All links already used or excluded.")
            return

        print(f"[Step1] Found unused link: {target_link}")

        # 5. "Redirect" -> Visit the link
        # On a server, we use requests.get to 'click' the link.
        print("[Step1] Visiting link (simulating redirect)...")
        try:
            # Timeout set to 10 seconds
            visit_response = requests.get(target_link, timeout=10)
            print(f"[Step1] Link visited. Status: {visit_response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"[Step1] Failed to visit link (network error): {e}")

        # 6. Save to history
        used_links.append(target_link)
        save_used_links(used_links)
        print("[Step1] Process complete. Link added to history.")

    except Exception as e:
        print(f"[Step1] An error occurred: {e}")

if __name__ == "__main__":
    # Run the process
    process_link()
