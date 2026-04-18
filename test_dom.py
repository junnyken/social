from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time

options = Options()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)
driver.get("http://localhost:3001/fb-autoposter.html#/integrations")
time.sleep(2)
print("MAIN HTML:")
print(driver.execute_script("return document.getElementById('main').innerHTML;"))
driver.quit()
