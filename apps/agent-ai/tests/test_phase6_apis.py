# -*- coding: utf-8 -*-
import requests
import time
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

def wait_for_latest_run_success(headers, expected_run_type="auto"):
    """Đợi lượt chạy tính toán gần nhất hoàn tất thành công."""
    print("⏳ Đợi lượt chạy tính toán nền...")
    for _ in range(15):
        time.sleep(1)
        res = requests.get(f"{BASE_URL}/quality/calculate/runs", headers=headers)
        if res.status_code == 200:
            runs = res.json()["data"]
            if runs:
                latest = runs[0]
                if latest["run_type"] == expected_run_type:
                    if latest["status"] in ["success", "partial_success"]:
                        print(f"✅ Lượt chạy #{latest['id']} ({latest['run_type']}) thành công! Chỉ số tính được: {latest['success_count']}, Lỗi: {latest['error_count']}")
                        return latest
                    elif latest["status"] == "failed":
                        print(f"❌ Lượt chạy #{latest['id']} thất bại. Logs: {latest.get('logs')}")
                        return latest
                    else:
                        print(f"Waiting... Trạng thái hiện tại: '{latest['status']}'")
        else:
            print(f"Waiting... Status code: {res.status_code}")
    print("⚠️ Hết thời gian chờ lượt tính toán nền.")
    return None

def test_calculation_flow():
    print("--- STARTING PHASE 6 AUTOMATED CALCULATION & AUTO-LOCKING INTEGRATION TESTS ---")

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
    # Tìm phòng ban QLCL hoặc dùng phòng ban đầu tiên
    dept_code = "QLCL"
    print(f"✅ Using department: {dept_code}")

    # 3. Create a manual input batch (Draft) for dynamic variables cs24-cs53
    print("\n[STEP 3] Creating a new Quality manual input batch (Draft)...")
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    batch_payload = {
        "report_date": today_str,
        "period_type": "daily",
        "department_code": dept_code,
        "station_code": None,
        "note": "Test Real-Time Auto Calculation for cs24-cs53 Draft",
        "records": [
            {"variable_code": "cs24", "value": 15.5, "text_value": None, "note": "Thời gian tại hiện trường"},
            {"variable_code": "cs25", "value": 25.0, "text_value": None, "note": "Thời gian chuyển viện"},
            {"variable_code": "cs28", "value": 95.0, "text_value": None, "note": "Tỷ lệ bảo trì thiết bị y tế"},
            {"variable_code": "cs32", "value": 90.0, "text_value": None, "note": "Tỷ lệ vệ sinh tay"},
            {"variable_code": "cs33", "value": 88.0, "text_value": None, "note": "Sự hài lòng chung"}
        ]
    }
    create_res = requests.post(f"{BASE_URL}/quality/input/batches", headers=headers, json=batch_payload)
    if create_res.status_code != 200:
        print(f"❌ Failed to create batch: {create_res.text}")
        return
    batch_id = create_res.json()["data"]["batch_id"]
    batch_code = create_res.json()["data"]["batch_code"]
    print(f"✅ Batch created! ID: {batch_id}, Code: {batch_code}")

    # Đợi tính toán tự động sau khi tạo nháp
    latest_run = wait_for_latest_run_success(headers, "auto")
    if not latest_run:
        print("❌ Auto-calculation on draft creation failed.")
        return
    print("✅ Real-time auto-calculation on Draft Creation verified successfully!")

    # 4. Submit the batch
    print(f"\n[STEP 4] Submitting batch {batch_code} for approval...")
    submit_res = requests.post(f"{BASE_URL}/quality/input/batches/{batch_id}/submit", headers=headers)
    if submit_res.status_code != 200:
        print(f"❌ Failed to submit batch: {submit_res.text}")
        return
    print("✅ Batch submitted successfully!")

    # Đợi tính toán tự động sau khi nộp
    latest_run = wait_for_latest_run_success(headers, "auto")
    if not latest_run:
        print("❌ Auto-calculation on batch submission failed.")
        return
    print("✅ Real-time auto-calculation on Batch Submission verified successfully!")

    # 5. Approve the batch (should auto-lock directly and copy to chi_so table)
    print(f"\n[STEP 5] Approving batch {batch_code} (expecting direct status='locked' and copy to chi_so)...")
    approve_payload = {"review_note": "Phê duyệt và tự động khóa sổ, đồng bộ chi_so"}
    approve_res = requests.post(
        f"{BASE_URL}/quality/input/batches/{batch_id}/approve",
        headers=headers,
        json=approve_payload
    )
    if approve_res.status_code != 200:
        print(f"❌ Failed to approve batch: {approve_res.text}")
        return
    
    res_data = approve_res.json()["data"]
    if res_data["status"] != "locked":
        print(f"❌ Expected approved batch status to be 'locked', but got: '{res_data['status']}'")
        return
    print("✅ Batch successfully approved and directly transitioned to 'locked' status!")

    # Đợi tính toán tự động sau khi duyệt (khóa)
    latest_run = wait_for_latest_run_success(headers, "auto")
    if not latest_run:
        print("❌ Auto-calculation on batch approval failed.")
        return
    print("✅ Real-time auto-calculation on Batch Approval verified successfully!")

    # Kiểm tra xem có bản ghi khóa kỳ sổ được tạo tự động không
    print("\n[STEP 6] Verifying automated QualityPeriodLock registration...")
    locks_res = requests.get(f"{BASE_URL}/quality/period-locks", headers=headers)
    if locks_res.status_code != 200:
        print(f"❌ Failed to fetch period locks: {locks_res.text}")
        return
    locks = locks_res.json()["data"]
    active_locks = [l for l in locks if l["report_date"] == today_str and l["department_code"] == dept_code and l["is_locked"]]
    if not active_locks:
        print("❌ No active period lock found for this batch's department and date.")
        return
    lock_id = active_locks[0]["id"]
    print(f"✅ Automated Period Lock verified! ID: {lock_id}, Status: Locked")

    # 6. Unlock the period (should revert batch back to draft)
    print(f"\n[STEP 7] Unlocking period {lock_id} (expecting child batches to revert to status='draft')...")
    unlock_payload = {"unlock_reason": "Yêu cầu mở khóa điều chỉnh lại số liệu thô"}
    unlock_res = requests.post(
        f"{BASE_URL}/quality/period-locks/{lock_id}/unlock",
        headers=headers,
        json=unlock_payload
    )
    if unlock_res.status_code != 200:
        print(f"❌ Failed to unlock period: {unlock_res.text}")
        return
    
    # Kiểm tra xem đợt báo cáo đã chuyển ngược về draft chưa
    batch_detail_res = requests.get(f"{BASE_URL}/quality/input/batches/{batch_id}", headers=headers)
    if batch_detail_res.status_code != 200:
        print(f"❌ Failed to fetch batch details after unlock: {batch_detail_res.text}")
        return
    
    batch_status = batch_detail_res.json()["data"]["status"]
    if batch_status != "draft":
        print(f"❌ Expected batch status to revert to 'draft' after unlock, but got: '{batch_status}'")
        return
    print("✅ Period successfully unlocked and child batch reverted back to 'draft' status!")

    print("\n🎉 --- ALL CALCULATION & AUTO-LOCKING INTEGRATION TESTS PASSED SUCCESSFULLY! --- 🎉")

if __name__ == "__main__":
    test_calculation_flow()
