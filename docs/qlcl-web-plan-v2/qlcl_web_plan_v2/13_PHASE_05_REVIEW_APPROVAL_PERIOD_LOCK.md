# 13 - Phase 5: Review, Approval & Period Lock

## 1. Mục tiêu

Hoàn thiện workflow kiểm soát dữ liệu: batch sau khi nhập/import phải được gửi duyệt, duyệt hoặc từ chối, sau đó khóa kỳ để bảo vệ dữ liệu đã chốt.

---

## 2. Đầu ra chính

```text
/reports/review
/reports/locked-periods
GET  /api/v1/quality/review/tasks
POST /api/v1/quality/input/batches/{batch_id}/approve
POST /api/v1/quality/input/batches/{batch_id}/reject
GET  /api/v1/quality/period-locks
POST /api/v1/quality/period-locks
POST /api/v1/quality/period-locks/{lock_id}/unlock
```

---

## 3. Không làm trong phase này

- Không tính chỉ số phức tạp.
- Không dashboard thật.
- Không export report.
- Không Agent-AI.

---

## 4. Batch 5A - Review tasks and approve/reject

### Backend

- Khi batch submit, tạo review task nếu chưa làm Phase 3.
- List review tasks theo permission/scope.
- Approve batch.
- Reject batch với lý do bắt buộc.

### Permission

```text
reports:review:view
reports:review:approve
reports:review:reject
```

### Quy tắc

- Không cho người nhập tự approve batch của mình, trừ khi là `quality_admin` hoặc cấu hình cho phép.
- Reviewer phải có scope với department/station của batch.
- Batch chỉ approve nếu status `submitted`.
- Reject phải ghi `reject_reason`.

### Audit

```text
approve_input_batch
reject_input_batch
```

---

## 5. Batch 5B - Period lock APIs and guards

### Backend

- List period locks.
- Lock period (Hệ thống tự động kích hoạt khi Trưởng khoa/Reviewer phê duyệt số liệu).
- Unlock period (Mở khóa phục vụ điều chỉnh).
- Thêm guard vào input/import APIs nếu chưa có.

### Permission

```text
reports:period_lock:view
reports:period_lock:lock
reports:period_lock:unlock
```

### Quy tắc lock & Mở khóa

- **Duyệt đồng nghĩa với Khóa sổ:** Khi Trưởng khoa phê duyệt đợt số liệu (`POST /approve`), batch status tự động chuyển sang `'locked'` và sinh bản ghi `QualityPeriodLock(is_locked=True)` tương ứng.
- **Mở khóa hoàn nháp:** Khi thực hiện mở khóa một kỳ hạn báo cáo (`POST /unlock`), hệ thống tự động đưa **tất cả** các lô số liệu con tương ứng ngược về trạng thái **Nháp (draft)** để nhân viên có thể sửa đổi và gửi duyệt lại.
- Kỳ đã khóa chặn hoàn toàn hành động create/update/submit/confirm import.
- Unlock bắt buộc lý do.

### Audit

```text
lock_period
unlock_period
```

---

## 6. Batch 5C - Frontend review and lock pages

### `/reports/review`

- List batch chờ duyệt.
- Detail records.
- Approve/reject modal.
- Review note.
- Reject reason required.

### `/reports/locked-periods`

- Ẩn form khóa sổ thủ công.
- Hiển thị danh sách kỳ báo cáo đã khóa rộng toàn màn hình (Full width).
- Bổ sung banner giới thiệu cơ chế tự động khóa sổ khi duyệt và mở khóa hồi nháp kỳ.
- Nút **Mở khóa** kích hoạt Modal nhập lý do mở khóa bắt buộc phục vụ Audit Trail.

---

## 7. State machine

```text
Manual input/import confirmed:
  draft → submitted → locked (auto-locked on approve)
                   ↘ rejected → draft/cancelled

Unlock Period Lock:
  locked → unlocked (reverts all child batches back to 'draft')
```

---

## 8. Checklist nghiệm thu Phase 5

```text
[x] Batch submit tạo review task
[x] Reviewer xem task theo scope
[x] Phê duyệt tự động chuyển batch sang locked và khóa sổ kỳ hạn
[x] Reject bắt buộc reason
[x] Data entry không tự approve nếu không có quyền đặc biệt
[x] Mở khóa kỳ báo cáo tự động hoàn trạng thái các lô con về draft để sửa đổi
[x] Kỳ đã khóa chặn sửa input/import confirm
[x] Unlock period yêu cầu reason bắt buộc phục vụ thanh tra
[x] Audit log có approve/reject/lock/unlock đầy đủ
[x] UI review hoạt động mượt mà
[x] UI locked-periods hoạt động toàn màn hình (không có form khóa tay)
[x] Không làm Agent-AI
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 5 - Review, Approval & Period Lock.
Tạo review task list, approve/reject input batch với permission/scope guard và audit log. Không cho người nhập tự duyệt nếu không có quyền đặc biệt. Tạo period lock APIs, lock/unlock với reason, và guard chặn sửa dữ liệu kỳ đã khóa. Tạo UI /reports/review và /reports/locked-periods.
Không làm calculation, dashboard, export, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```
