import sys
import requests

def run_tests():
    base_url = "http://127.0.0.1:8085"
    print("Testing FastAPI server running at", base_url)
    
    # Test Root
    r = requests.get(f"{base_url}/")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("[OK] Root responds:", r.json())
    
    # Test Data
    r = requests.get(f"{base_url}/api/data")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert len(data) > 0, "No data records"
    print(f"[OK] GET /api/data returned {len(data)} records.")
    
    # Test SEVI
    r = requests.get(f"{base_url}/api/sevi")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    sevi = r.json()
    assert len(sevi) > 0, "No SEVI records"
    print(f"[OK] GET /api/sevi returned {len(sevi)} state summaries.")
    
    # Test Anomalies
    r = requests.get(f"{base_url}/api/anomalies")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    anoms = r.json()
    assert len(anoms) > 0, "No anomaly records"
    print(f"[OK] GET /api/anomalies returned {len(anoms)} anomalies.")
    
    # Test Forecast Metrics
    r = requests.get(f"{base_url}/api/forecast")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    metrics = r.json()
    assert "lr" in metrics and "rf" in metrics, "Missing lr or rf metrics"
    print(f"[OK] GET /api/forecast returned metrics: {metrics}")
    
    # Test Forecast Prediction
    payload = {"State": "Maharashtra", "TargetDate": "2025-01-01"}
    r = requests.post(f"{base_url}/api/forecast", json=payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    pred = r.json()
    assert pred["State"] == "Maharashtra", "State name mismatch"
    print(f"[OK] POST /api/forecast returned prediction: {pred}")
    
    print("=== ALL ENDPOINTS VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    try:
        run_tests()
        sys.exit(0)
    except Exception as e:
        print("Test failed:", e)
        sys.exit(1)
