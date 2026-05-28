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
- Lock period.
- Unlock period.
- Thêm guard vào input/import APIs nếu chưa có.

### Permission

```text
reports:period_lock:view
reports:period_lock:lock
reports:period_lock:unlock
```

### Quy tắc lock

- Nên yêu cầu tất cả batch trong kỳ/scope đã approved hoặc cancelled.
- Không cho lock nếu còn batch submitted chưa xử lý, trừ khi `quality_admin` override.
- Kỳ đã khóa chặn create/update/submit/confirm import.
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

- Filter date/period/department/station.
- List lock status.
- Lock/unlock action.
- Unlock reason modal.

---

## 7. State machine

```text
Manual input/import confirmed:
  draft → submitted → approved → locked
                   ↘ rejected → draft/cancelled
```

Period lock:

```text
unlocked → locked → unlocked (with reason) → locked
```

---

## 8. Checklist nghiệm thu Phase 5

```text
[ ] Batch submit tạo review task
[ ] Reviewer xem task theo scope
[ ] Approve được batch submitted
[ ] Reject bắt buộc reason
[ ] Data entry không tự approve nếu không có quyền đặc biệt
[ ] Lock period được
[ ] Kỳ đã khóa chặn sửa input/import confirm
[ ] Unlock period yêu cầu reason
[ ] Audit log có approve/reject/lock/unlock
[ ] UI review hoạt động
[ ] UI locked-periods hoạt động
[ ] Không làm Agent-AI
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 5 - Review, Approval & Period Lock.
Tạo review task list, approve/reject input batch với permission/scope guard và audit log. Không cho người nhập tự duyệt nếu không có quyền đặc biệt. Tạo period lock APIs, lock/unlock với reason, và guard chặn sửa dữ liệu kỳ đã khóa. Tạo UI /reports/review và /reports/locked-periods.
Không làm calculation, dashboard, export, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```
