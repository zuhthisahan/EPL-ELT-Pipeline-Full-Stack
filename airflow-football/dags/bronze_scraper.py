from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
# from webdriver_manager.chrome import ChromeDriverManager # Commented out since we are now installing ChromeDriver directly in the Dockerfile for better stability  
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from datetime import datetime
import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException


BASE_URL = 'https://understat.com/'
DATA_LAKE_ROOT = "/opt/airflow/data_lake/bronze"
LOAD_DATE = datetime.now().strftime("%Y-%m-%d")

def init_driver(url):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    # --- THE DOCKER CRASH FIXES ---
    options.add_argument('--disable-gpu')
    options.add_argument('--remote-debugging-port=9222')
    options.add_argument('--window-size=1920,1080') # This replaces maximize_window()
    
    # driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver = webdriver.Chrome(options=options)
    driver.get(url) # Notice we removed driver.maximize_window() here!
    return driver

def close_driver(driver):
    driver.quit()

def save_to_bronze(data, category, filename):
    """Saves data to a partitioned Bronze layer."""
    # 1. Create the partition path: data_lake/bronze/category/load_date=YYYY-MM-DD/
    partition_path = os.path.join(DATA_LAKE_ROOT, category, f"load_date={LOAD_DATE}")
    os.makedirs(partition_path, exist_ok=True)
    
    # 2. Add metadata (extraction timestamp)
    extraction_meta = {
        "extraction_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "load_date": LOAD_DATE,
        "source": "Understat"
    }
    
    if isinstance(data, dict):
        data["_metadata"] = extraction_meta
    else:
        data = {"data": data, "_metadata": extraction_meta}

    # 3. Save file
    filepath = os.path.join(partition_path, f"{filename}.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Bronze Saved: {filepath}")

# 1. SCRAPING FUNCTIONS


def select_league(driver):
    try:
        epl_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "EPL"))
        )
        epl_link.click()
    except Exception as e:
        print(f"Error selecting league: {e}")

def scrap_table(driver):
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            base_xpath = "//div[@id='league-chemp']//table"
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, f"{base_xpath}/tbody/tr")))

            header_elements = driver.find_elements(By.XPATH, f"{base_xpath}/thead/tr/th")
            headers = [th.get_attribute("title").strip() if th.get_attribute("title") else th.text.strip() for th in header_elements]

            row_elements = driver.find_elements(By.XPATH, f"{base_xpath}/tbody/tr")
            all_team_data = []
            
            for row in row_elements:
                cells = row.find_elements(By.XPATH, "./td")
                row_data = []
                for cell in cells:
                    a_tag = cell.find_elements(By.XPATH, "./a")
                    if a_tag:
                        row_data.append(a_tag[0].text.strip())
                        row_data.append(a_tag[0].get_attribute("href")) # Save URL
                    else:
                        full_text = cell.text.strip()
                        sup = cell.find_elements(By.XPATH, "./sup")
                        if sup and full_text.endswith(sup[0].text):
                            full_text = full_text[:-len(sup[0].text)].strip()
                        row_data.append(full_text)
                all_team_data.append(row_data)

            return headers, all_team_data

        except StaleElementReferenceException:
            time.sleep(1)
            
    return [], []

def scrape_team_matches(driver):
    results, fixtures = [], []
    try:
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.calendar-date-container")))
        match_blocks = driver.find_elements(By.CSS_SELECTOR, "div.calendar-date-container.mini")

        for block in match_blocks:
            try:
                date_element = block.find_element(By.CSS_SELECTOR, "div.calendar-date")
                date = date_element.text.strip()
                side = date_element.get_attribute("data-side")       
                result_status = date_element.get_attribute("data-result") 
                opponent = block.find_element(By.CSS_SELECTOR, "div.team-title").text.strip()

                if result_status:
                    match_link = block.find_element(By.CSS_SELECTOR, "a.match-info").get_attribute("href")
                    home_score = block.find_element(By.CSS_SELECTOR, "div.teams-goals .team-home").text.strip()
                    away_score = block.find_element(By.CSS_SELECTOR, "div.teams-goals .team-away").text.strip()
                    home_xg = block.find_element(By.CSS_SELECTOR, "div.teams-xG .team-home").text.replace('\n', '').strip()
                    away_xg = block.find_element(By.CSS_SELECTOR, "div.teams-xG .team-away").text.replace('\n', '').strip()

                    if side == 'h':
                        team_score, opp_score, team_xg, opp_xg = home_score, away_score, home_xg, away_xg
                    else:
                        team_score, opp_score, team_xg, opp_xg = away_score, home_score, away_xg, home_xg

                    results.append({"date": date, "opponent": opponent, "side": side, "result": result_status,
                                    "team_score": team_score, "opponent_score": opp_score, "team_xg": team_xg, 
                                    "opponent_xg": opp_xg, "match_link": match_link})
                else:
                    match_time = block.find_element(By.CSS_SELECTOR, "div.match-time").text.strip()
                    fixtures.append({"date": date, "time": match_time, "opponent": opponent, "side": side})

            except Exception:
                continue 

        results.reverse()
        return results, fixtures
    except Exception:
        return [], []

def scrape_team_statistics(driver):
    for attempt in range(3):
        try:
            base_xpath = "//div[@id='team-statistics']//table"
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, f"{base_xpath}/tbody/tr")))
            headers = [th.get_attribute("title") or th.text for th in driver.find_elements(By.XPATH, f"{base_xpath}/thead/tr/th")]
            headers = [h.strip() for h in headers]
    
            stats_data = []
            for row in driver.find_elements(By.XPATH, f"{base_xpath}/tbody/tr"):
                cells = row.find_elements(By.XPATH, "./td")
                row_data = {}
                for i, cell in enumerate(cells):
                    full_text = cell.text.strip()
                    sup = cell.find_elements(By.XPATH, "./sup")
                    if sup and full_text.endswith(sup[0].text):
                        full_text = full_text[:-len(sup[0].text)].strip()
                    col_name = headers[i] if i < len(headers) else f"Column_{i}"
                    row_data[col_name] = full_text
                stats_data.append(row_data)
            return headers, stats_data
        except StaleElementReferenceException:
            time.sleep(1)
    return [], []

def scrape_player_statistics(driver):
    for attempt in range(3):
        try:
            base_xpath = "//div[@id='team-players']//table"
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, f"{base_xpath}/tbody/tr")))
            headers = [th.get_attribute("title") or th.text for th in driver.find_elements(By.XPATH, f"{base_xpath}/thead/tr/th")]
            headers = [h.strip() for h in headers]

            player_data = []
            for row in driver.find_elements(By.XPATH, f"{base_xpath}/tbody/tr"):
                cells = row.find_elements(By.XPATH, "./td")
                row_data = {} 
                for i, cell in enumerate(cells):
                    col_name = headers[i] if i < len(headers) else f"Column_{i}"
                    a_tag = cell.find_elements(By.XPATH, "./a")
                    if a_tag:
                        row_data[col_name] = a_tag[0].text.strip()
                        row_data["Player_URL"] = a_tag[0].get_attribute("href")
                        continue 

                    full_text = cell.text.strip()
                    sup = cell.find_elements(By.XPATH, "./sup")
                    if sup and full_text.endswith(sup[0].text):
                        full_text = full_text[:-len(sup[0].text)].strip()
                    row_data[col_name] = full_text
                player_data.append(row_data)
            return headers, player_data
        except StaleElementReferenceException:
            time.sleep(1)
    return [], []

def process_single_player(player):
    """The isolated worker function for parallel threading."""
    p_name = player["name"]
    p_url = player["url"]
    
    print(f"[Thread Started] Scraping: {p_name}")
    
    local_driver = init_driver(p_url) 
    
    try:
        profile_data = scrape_player_profile(local_driver, p_name, p_url, max_matches=38)
        
        # Bronze layer save logic
        filename = p_name.replace(" ", "_").lower()
        save_to_bronze(profile_data, "players", filename)
        print(f"[Thread Finished] Saved: {p_name}")
        
    except Exception as e:
        print(f"[Thread Error] Failed on {p_name}: {e}")
        
    finally:
        close_driver(local_driver)

def scrape_player_profile(driver, player_name, player_url, max_matches=38):
    print(f"    -> Scraping deep profile for: {player_name}")
    player_profile = {"player_name": player_name, "player_url": player_url, "seasonal_performance": [], "match_performance": []}

    # 1. Seasons
    try:
        season_xpath = "//div[@id='player-groups']//table"
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, f"{season_xpath}/tbody/tr")))
        headers = [th.get_attribute("title") or th.text for th in driver.find_elements(By.XPATH, f"{season_xpath}/thead/tr/th")]
        headers = [h.strip() for h in headers]

        for row in driver.find_elements(By.XPATH, f"{season_xpath}/tbody/tr"):
            cells = row.find_elements(By.XPATH, "./td")
            row_data = {}
            for i, cell in enumerate(cells):
                col_name = headers[i] if i < len(headers) else f"Col_{i}"
                full_text = cell.text.strip()
                sup = cell.find_elements(By.XPATH, "./sup")
                if sup and full_text.endswith(sup[0].text):
                    full_text = full_text[:-len(sup[0].text)].strip()
                row_data[col_name] = full_text
            player_profile["seasonal_performance"].append(row_data)
    except Exception:
        pass 

    # 2. Matches
    try:
        match_xpath = "//table[.//th[contains(., 'Date')] and .//th[contains(., 'Home')]]"
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, f"{match_xpath}/tbody/tr")))
        headers = [th.get_attribute("title") or th.text for th in driver.find_elements(By.XPATH, f"{match_xpath}/thead/tr/th")]
        headers = [h.strip() for h in headers]

        while True:
            rows = driver.find_elements(By.XPATH, f"{match_xpath}/tbody/tr")
            if not rows: break
            first_row_reference = rows[0]

            for row in rows:
                cells = row.find_elements(By.XPATH, "./td")
                row_data = {}
                for i, cell in enumerate(cells):
                    col_name = headers[i] if i < len(headers) else f"Col_{i}"
                    full_text = cell.text.strip()
                    sup = cell.find_elements(By.XPATH, "./sup")
                    if sup and full_text.endswith(sup[0].text):
                        full_text = full_text[:-len(sup[0].text)].strip()
                    row_data[col_name] = full_text
                    
                if row_data.get("Date") != "":
                    player_profile["match_performance"].append(row_data)
                    if len(player_profile["match_performance"]) >= max_matches:
                        break
            
            if len(player_profile["match_performance"]) >= max_matches:
                break

            next_btn = driver.find_elements(By.XPATH, "//ul[@class='pagination']/li[contains(@class, 'prevNext')][last()]")
            if not next_btn or "disabled" in next_btn[0].get_attribute("class"):
                break
            
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_btn[0])
            time.sleep(0.5)
            driver.execute_script("arguments[0].click();", next_btn[0])
            
            try: WebDriverWait(driver, 10).until(EC.staleness_of(first_row_reference))
            except TimeoutException: break

    except Exception:
        pass
        
    return player_profile


def run_pipeline():
    driver = init_driver(BASE_URL)
    all_player_urls = [] 
    
    #  PHASE 1: LEAGUE DATA 
    print("\n=== PHASE 1: LEAGUE STANDINGS ===")
    select_league(driver)
    league_headers, league_data = scrap_table(driver)
    
    formatted_league_data = [{"Team": row[1], "URL": row[2], "Data": row} for row in league_data]
    # New Bronze layer save logic
    save_to_bronze(formatted_league_data, "league", "standings")
    
    # PHASE 2: TEAM DATA 
    print("\n=== PHASE 2: TEAM DATA ===")
    
    for team in league_data: # to change the slice here for testing, [:2] for just 2 teams 
        team_name = team[1]
        team_url = team[2]
        
        print(f"\nScraping Team: {team_name}...")
        driver.get(team_url)
        
        results, fixtures = scrape_team_matches(driver)
        stat_headers, stats_data = scrape_team_statistics(driver)
        roster_headers, roster_data = scrape_player_statistics(driver)
        
        team_package = {
            "team_name": team_name,
            "url": team_url,
            "results": results,
            "fixtures": fixtures,
            "statistics": stats_data,
            "roster": roster_data
        }
        filename = team_name.replace(" ", "_").lower()
        
        # New Bronze layer save logic
        save_to_bronze(team_package, "teams", filename)
        
        for player in roster_data:
            if "Player_URL" in player:
                all_player_urls.append({
                    "name": player.get("Player"), 
                    "url": player["Player_URL"],
                    "team": team_name
                })

    # PHASE 3: PLAYER Data (PARALLELIZED)
    print("\n=== PHASE 3: INDIVIDUAL PLAYERS ===")
    print(f"Total players found: {len(all_player_urls)}")
    
    close_driver(driver) 
    
    MAX_THREADS = 5
    print(f" Launching Thread Pool with {MAX_THREADS} workers...")
    
    
    test_batch = all_player_urls # Change slice for small batch here
    
    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = [executor.submit(process_single_player, player) for player in test_batch]
        for future in as_completed(futures):
            try:
                future.result() 
            except Exception as e:
                print(f"A worker thread crashed completely: {e}")

    print("\n ALL PHASES COMPLETE! ")

if __name__ == "__main__":
    run_pipeline()