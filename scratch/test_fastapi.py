import os
import sys
import time
import requests
import subprocess
import signal

# Append the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_backend():
    print("=== STARTING FASTAPI ENDPOINT VERIFICATION ===")
    
    # 1. Start uvicorn server in a subprocess
    # Set GEMINI_API_KEY environment variable dummy if not set, to allow import
    env = os.environ.copy()
    if "GEMINI_API_KEY" not in env:
        env["GEMINI_API_KEY"] = "mock-key-for-testing"
        
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8085"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Give the server a few seconds to start up
    time.sleep(3)
    
    base_url = "http://127.0.0.1:8085"
    
    try:
        # Test Root endpoint
        print("Testing root endpoint...")
        r = requests.get(f"{base_url}/")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print(f"[OK] Root responds: {r.json()}")

        # Test GET /api/data
        print("Testing GET /api/data...")
        r = requests.get(f"{base_url}/api/data")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert len(data) > 0, "Expected non-empty list of data records"
        print(f"[OK] GET /api/data returned {len(data)} records. First record: {data[0]}")

        # Test GET /api/sevi
        print("Testing GET /api/sevi...")
        r = requests.get(f"{base_url}/api/sevi")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        sevi_data = r.json()
        assert len(sevi_data) > 0, "Expected non-empty list of SEVI response records"
        print(f"[OK] GET /api/sevi returned {len(sevi_data)} state aggregates. First state: {sevi_data[0]}")

        # Test GET /api/anomalies
        print("Testing GET /api/anomalies...")
        r = requests.get(f"{base_url}/api/anomalies")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        anoms = r.json()
        assert len(anoms) > 0, "Expected non-empty list of anomaly records"
        print(f"[OK] GET /api/anomalies returned {len(anoms)} anomaly records. First: {anoms[0]}")

        # Test GET /api/forecast (metrics)
        print("Testing GET /api/forecast (metrics)...")
        r = requests.get(f"{base_url}/api/forecast")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        forecast_metrics = r.json()
        assert "lr" in forecast_metrics and "rf" in forecast_metrics, "Expected both lr and rf metrics"
        print(f"[OK] GET /api/forecast returned model metrics: {forecast_metrics}")

        # Test POST /api/forecast (prediction)
        print("Testing POST /api/forecast (prediction)...")
        payload = {"State": "Maharashtra", "TargetDate": "2025-01-01"}
        r = requests.post(f"{base_url}/api/forecast", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        prediction = r.json()
        assert prediction["State"] == "Maharashtra", "Expected state Maharashtra"
        assert "Predicted_Deficit_Percent_RF" in prediction, "Expected Random Forest prediction"
        print(f"[OK] POST /api/forecast returned prediction: {prediction}")

        print("\n[SUCCESS] ALL FASTAPI ENDPOINTS ARE RESPONDING CORRECTLY!")
        success = True
    except Exception as e:
        print(f"\n[ERROR] Test failed with exception: {e}")
        # Print subprocess stderr/stdout to debug if there's an error
        server_process.kill()
        stdout, stderr = server_process.communicate()
        print("--- Server stdout ---")
        print(stdout)
        print("--- Server stderr ---")
        print(stderr)
        success = False
    finally:
        # Clean up process
        try:
            server_process.terminate()
            server_process.wait(timeout=3)
        except Exception:
            server_process.kill()
            
    return success

if __name__ == "__main__":
    success = test_backend()
    sys.exit(0 if success else 1)
