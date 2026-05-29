import os
import hashlib
import json
import threading
from collections import OrderedDict
from dotenv import load_dotenv

load_dotenv()

CACHE_TYPE = os.getenv("CACHE_TYPE", "memory")
REDIS_URL = os.getenv("REDIS_URL", "")

# Thread-safe in-memory LRU Cache settings
MAX_CACHE_SIZE = 1000
_mem_cache = OrderedDict()
_cache_lock = threading.Lock()

# Pluggable Redis Client
redis_client = None

if CACHE_TYPE == "redis" and REDIS_URL:
    try:
        import redis
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        print("[CACHE] Pluggable Redis Cache connected successfully.")
    except Exception as e:
        print(f"[CACHE ERROR] Failed to connect to Redis: {e}. Falling back to In-Memory Cache.")
        CACHE_TYPE = "memory"


def get_transaction_hash(input_data: dict) -> str:
    """
    Computes a stable SHA-256 hash from raw input data fields to use as cache keys.
    """
    # Exclude non-input keys if they are passed
    features_only = {
        k: float(v) for k, v in input_data.items()
        if k == "Amount" or k.startswith("V")
    }
    stable_str = json.dumps(features_only, sort_keys=True)
    return hashlib.sha256(stable_str.encode("utf-8")).hexdigest()


def get_cached_prediction(tx_hash: str) -> dict:
    """
    Retrieves cached prediction results if available.
    """
    global CACHE_TYPE
    
    if CACHE_TYPE == "redis" and redis_client:
        try:
            cached_val = redis_client.get(f"predict:{tx_hash}")
            if cached_val:
                print(f"[CACHE HIT] Redis hit for transaction hash: {tx_hash[:8]}")
                return json.loads(cached_val)
        except Exception as e:
            print(f"[CACHE WARNING] Redis read failed: {e}")
            
    # In-memory fallback
    with _cache_lock:
        if tx_hash in _mem_cache:
            # Move key to end to maintain LRU order
            _mem_cache.move_to_end(tx_hash)
            print(f"[CACHE HIT] Memory hit for transaction hash: {tx_hash[:8]}")
            return _mem_cache[tx_hash]
            
    return None


def set_cached_prediction(tx_hash: str, result: dict):
    """
    Saves prediction results in the cache.
    """
    global CACHE_TYPE
    
    if CACHE_TYPE == "redis" and redis_client:
        try:
            # Cache predictions for 24 hours (86400 seconds)
            redis_client.setex(f"predict:{tx_hash}", 86400, json.dumps(result))
            return
        except Exception as e:
            print(f"[CACHE WARNING] Redis write failed: {e}")
            
    # In-memory fallback
    with _cache_lock:
        if tx_hash in _mem_cache:
            _mem_cache.move_to_end(tx_hash)
        _mem_cache[tx_hash] = result
        
        # Evict oldest item if cache exceeds limit
        if len(_mem_cache) > MAX_CACHE_SIZE:
            _mem_cache.popitem(last=False)
