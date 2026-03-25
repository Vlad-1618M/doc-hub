#!/bin/bash

off="\033[0m"
red="\033[0;31m"
gray="\033[0;37m"
cyan="\033[1;36m"
white="\033[1;37m"
green="\033[0;32m"
yellow="\033[0;33m"
magenta="\033[0;35m"

decorator_init="echo -e ${yellow}$(printf '.%.0s' {1..123})${off}"
decorator_done="echo -e ${gray}$(printf '=%.0s' {1..63})${off}"
JOB="${green}JOB:${gray} --> $(printf '%.0s' {1..1})${off}"

# BASE_URL="http://127.0.0.1:8000/resume"
BASE_URL="http://doc-hub-api:8000/resume"

# ... read /tmp dir path for api token load:
if [[ ! -f /tmp/api_key.txt ]]; then
    echo -e "\n$JOB API token ${red}not found${off}! Call${gray} --> ${yellow}get_auth_key.sh${off} script to get new token."
    exit 1
fi

API_KEY=$(cat /tmp/api_key.txt)

# ... list of Presidents and Terms to mock resumes:
PRESIDENT_NAMES=(
    "George Washington" "John Adams" "Thomas Jefferson" "James Madison" "James Monroe"
    "John Quincy Adams" "Andrew Jackson" "Martin Van Buren" "William Henry Harrison"
    "John Tyler" "James K Polk" "Zachary Taylor" "Millard Fillmore" "Franklin Pierce"
    "James Buchanan" "Abraham Lincoln" "Andrew Johnson" "Ulysses S Grant" "Rutherford B Hayes"
    "James A Garfield" "Chester A Arthur" "Grover Cleveland" "Benjamin Harrison"
    "Grover Cleveland" "William McKinley" "Theodore Roosevelt" "William H Taft" "Woodrow Wilson"
    "Warren G Harding" "Calvin Coolidge" "Herbert Hoover" "Franklin D Roosevelt" "Harry S Truman"
    "Dwight D Eisenhower" "John F Kennedy" "Lyndon B Johnson" "Richard Nixon"
    "Gerald Ford" "Jimmy Carter" "Ronald Reagan" "George H W Bush" "Bill Clinton"
    "George W Bush" "Barack Obama" "Donald Trump" "Joe Biden" "Donald Trump"
)

PRESIDENT_YEARS=(
    "1789-1797" "1797-1801" "1801-1809" "1809-1817" "1817-1825"
    "1825-1829" "1829-1837" "1837-1841" "1841" "1841-1845"
    "1845-1849" "1849-1850" "1850-1853" "1853-1857" "1857-1861"
    "1861-1865" "1865-1869" "1869-1877" "1877-1881" "1881"
    "1881-1885" "1885-1889" "1889-1893" "1893-1897" "1897-1901"
    "1901-1909" "1909-1913" "1913-1921" "1921-1923" "1923-1929"
    "1929-1933" "1933-1945" "1945-1953" "1953-1961" "1961-1963"
    "1963-1969" "1969-1974" "1974-1977" "1977-1981" "1981-1989"
    "1989-1993" "1993-2001" "2001-2009" "2009-2017" "2017-2021"
    "2021-2024" "2024-Present"
)

echo -e "\n$JOB ${white}Creating ${off}multiple resume sets:"
$decorator_init

# ... counter init:
count=1

for i in "${!PRESIDENT_NAMES[@]}"; do
    name="${PRESIDENT_NAMES[$i]}"
    years="${PRESIDENT_YEARS[$i]}"

    # Extract first and last names
    first_name=$(echo "$name" | awk '{print $1}')
    last_name=$(echo "$name" | awk '{print $2, $3}' | sed 's/ *$//')  # ... Handle possible middle names:
    EMAIL=$(echo "${first_name}_${last_name}" | sed 's/ /_/g')@whitehouse.gov

    JSON_PAYLOAD=$(cat <<EOF
{
  "resume": {
      "name": {
          "first_name": "${first_name}",
          "last_name": "${last_name}"
      },
      "job_title": {
          "position": "President",
          "role": "President of the United States"
      },
      "contact": {
          "email": "${EMAIL}",
          "phone": "+1-202-555-1234"
      },
      "skills": {
          "Leadership": {},
          "Public_Speaking": {},
          "Crisis_Management": {}
      }
  },
  "Work_Experience": [
      {
          "org_name": "United States",
          "location": "Washington, D.C.",
          "employment_length": "${years}",
          "role": "President",
          "job_description": "Served as U.S. President."
      }
  ],
  "education": {
      "degree": "Law",
      "location": "University of Example",
      "majored_in": "Political Science"
  }
}
EOF
)

    RESPONSE=$(curl -s -X POST "${BASE_URL}/" \
         -H "X-API-Key: ${API_KEY}" \
         -H "Content-Type: application/json" \
         -d "$JSON_PAYLOAD")

    if jq -e '.message' <<< "$RESPONSE" >/dev/null 2>&1; then
        ID=$(echo "$RESPONSE" | jq -r '.id')
        printf "${JOB} new: ${cyan}%-27s${gray} --> ${yellow}resume${off} created: ${white}response: ${green}\"id\":${cyan}\"%s\" ${gray}|${off} db ${white}entry${off} count ${yellow}%d${off}\n" "$name" "$ID" "$count"
    else
        echo -e "$JOB ${red}Error:${off} API returned failure: $RESPONSE"
    fi
    
    count=$((count + 1))
done
