import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

def test_flow():
    print("--- STARTING PHASE 5 INTEGRATION TESTS ---")

    # 1. Login
    print("\n[STEP 1] Logging in as admin...")
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    if login_res.status_code != 200:
        print(f"❌ Login failed: {login_res.text}")
        return
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("✅ Logged in successfully!")

    # 2. Get master departments
    print("\n[STEP 2] Fetching master departments...")
    depts_res = requests.get(f"{BASE_URL}/quality/master/departments", headers=headers)
    if depts_res.status_code != 200:
        print(f"❌ Failed to fetch departments: {depts_res.text}")
        return
    depts = depts_res.json()["data"]
    if not depts:
        print("❌ No departments found.")
        return
    dept_code = depts[0]["code"]
    print(f"✅ Using department: {dept_code}")

    # 3. Create a draft batch
    print("\n[STEP 3] Creating a new Quality manual input batch (Draft)...")
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    batch_payload = {
        "report_date": today_str,
        "period_type": "daily",
        "department_code": dept_code,
        "station_code": None,
        "note": "Test Phase 5 Integration Script",
        "records": [
            {
                "variable_code": "A1",
                "value": 15,
                "text_value": None,
                "note": "Hợp lệ"
            },
            {
                "variable_code": "A2",
                "value": 20,
                "text_value": None,
                "note": "Hợp lệ"
            }
        ]
    }
    create_res = requests.post(f"{BASE_URL}/quality/input/batches", headers=headers, json=batch_payload)
    if create_res.status_code != 200:
        print(f"❌ Failed to create batch: {create_res.text}")
        return
    batch_id = create_res.json()["data"]["batch_id"]
    batch_code = create_res.json()["data"]["batch_code"]
    print(f"✅ Batch created! ID: {batch_id}, Code: {batch_code}")

    # 4. Submit the batch
    print(f"\n[STEP 4] Submitting batch {batch_code} for approval...")
    submit_res = requests.post(f"{BASE_URL}/quality/input/batches/{batch_id}/submit", headers=headers)
    if submit_res.status_code != 200:
        print(f"❌ Failed to submit batch: {submit_res.text}")
        return
    print("✅ Batch submitted successfully! Review Task should be generated.")

    # 5. Fetch review tasks and verify
    print("\n[STEP 5] Fetching review tasks...")
    tasks_res = requests.get(f"{BASE_URL}/quality/review/tasks?status=pending", headers=headers)
    if tasks_res.status_code != 200:
        print(f"❌ Failed to fetch review tasks: {tasks_res.text}")
        return
    tasks = tasks_res.json()["data"]
    task_found = next((t for t in tasks if t["target_id"] == batch_id), None)
    if not task_found:
        print(f"❌ Review task for batch ID {batch_id} not found in pending list.")
        return
    print(f"✅ Found pending review task ID: {task_found['id']}")

    # 6. Try to lock period (should FAIL because the batch is still pending review)
    print("\n[STEP 6] Testing Lock Period (expected to fail due to outstanding pending batch)...")
    lock_payload = {
        "period_type": "daily",
        "report_date": today_str,
        "department_code": dept_code,
        "station_code": None,
        "override_pending": False
    }
    lock_fail_res = requests.post(f"{BASE_URL}/quality/period-locks", headers=headers, json=lock_payload)
    if lock_fail_res.status_code == 400:
        print(f"✅ Lock check works perfectly! Blocked as expected. Error: {lock_fail_res.json()['detail']}")
    else:
        print(f"❌ Lock check failed to block! Status code: {lock_fail_res.status_code}, Response: {lock_fail_res.text}")
        return

    # 7. Approve the batch
    print(f"\n[STEP 7] Approving batch {batch_code}...")
    approve_payload = {"review_note": "Phê duyệt nhanh bằng script integration test"}
    approve_res = requests.post(
        f"{BASE_URL}/quality/input/batches/{batch_id}/approve",
        headers=headers,
        json=approve_payload
    )
    if approve_res.status_code != 200:
        print(f"❌ Failed to approve batch: {approve_res.text}")
        return
    print("✅ Batch approved successfully!")

    # 8. Try to lock period again (should SUCCEED with admin override)
    print("\n[STEP 8] Locking period (expected to succeed with override)...")
    lock_override_payload = dict(lock_payload)
    lock_override_payload["override_pending"] = True
    lock_success_res = requests.post(f"{BASE_URL}/quality/period-locks", headers=headers, json=lock_override_payload)
    if lock_success_res.status_code != 200:
        print(f"❌ Failed to lock period: {lock_success_res.text}")
        return
    lock_id = lock_success_res.json()["data"]["lock_id"]
    print(f"✅ Period locked successfully! Lock ID: {lock_id}")

    # 9. Verify that editing is BLOCKED when period is locked
    print("\n[STEP 9] Verifying that editing/submitting is blocked during period lock...")
    # Try to update the approved batch (should fail because locked)
    update_payload = {
        "report_date": today_str,
        "period_type": "daily",
        "department_code": dept_code,
        "station_code": None,
        "note": "Cố tình sửa đổi dữ liệu đã khóa",
        "records": []
    }
    update_fail_res = requests.put(f"{BASE_URL}/quality/input/batches/{batch_id}", headers=headers, json=update_payload)
    if update_fail_res.status_code == 400:
         print(f"✅ Edit guard works perfectly! Blocked as expected. Error: {update_fail_res.json()['detail']}")
    else:
         print(f"❌ Edit guard failed! Allowed editing locked data. Status: {update_fail_res.status_code}")
         return

    # 10. Unlock the period
    print(f"\n[STEP 10] Unlocking period ID {lock_id}...")
    unlock_payload = {"unlock_reason": "Yêu cầu mở khóa sổ để sửa số liệu cuối ngày"}
    unlock_res = requests.post(
        f"{BASE_URL}/quality/period-locks/{lock_id}/unlock",
        headers=headers,
        json=unlock_payload
    )
    if unlock_res.status_code != 200:
        print(f"❌ Failed to unlock period: {unlock_res.text}")
        return
    print("✅ Period unlocked successfully!")

    print("\n🎉 --- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! --- 🎉")

if __name__ == "__main__":
    test_flow()
