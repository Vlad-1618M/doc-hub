#!/usr/bin/env python

import secrets
import string
from typing import List

def generate_api_key(length: int = 64) -> str:
    """ Creates random,length specified API key:
        Args:    -> length (int): The length of the API key: [ Default is 64 ]:
        Returns: -> str: Random API key: """
    characters = string.ascii_letters + string.digits + string.punctuation       # <-- key char-set defenition | letters, numbers, symbols:
    first_char = secrets.choice(string.ascii_letters)                            # <-- first character is a letter alwasy
    rest_chars = ''.join(secrets.choice(characters) for _ in range(length - 1))  # <-- string length range specified: 
    return first_char + rest_chars

def generate_multiple_api_keys(count: int = 5, length: int = 64) -> List[str]:
    """ Creates random,length specified multiple API keys:
        Args:    -> count (int): The number of API keys to generate: [ Default is 5 ]:
        length:  -> (int): The length of each API key: [ Default is 64 ]:
        Returns: -> list[str]: A list of random API keys: """
    
    return [generate_api_key(length) for _ in range(count)]


if __name__ == "__main__":
    pass
    # single_key = generate_api_key()
    # multiple_keys = generate_multiple_api_keys(count=10)
    # [print(f"count: {indx} key: [ {key} ]") for indx, key in enumerate(multiple_keys, start=1)]
    # print("="*55)
    # print(f"Generated API Key: [ {single_key} ]")
    