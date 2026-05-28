# 18 - Phase 10: Agent-AI Integration Later

## 1. Mục tiêu

Tích hợp Agent-AI vào QLCL Web như một module phụ sau khi MVP QLCL Web đã ổn định. Agent-AI không phải ưu tiên trong các phase trước.

---

## 2. Khi nào bắt đầu Phase 10?

Chỉ bắt đầu khi các điều kiện sau đạt:

```text
[ ] Login/Auth hoạt động ổn định
[ ] RBAC/permission/scope hoạt động
[ ] Portal shell ổn định
[ ] Nhập liệu/import/review/lock không còn lỗi blocking
[ ] Dashboard MVP dùng được
[ ] Admin/audit cơ bản có sẵn
```

---

## 3. Định hướng tích hợp

Agent-AI được đưa vào QLCL Web theo giao diện và quyền của QLCL Web:

```text
/ai-agent
/ai-agent/chat
```

Permission:

```text
ai_agent:use
```

Menu “Trợ lý AI” chỉ hiển thị khi user có `ai_agent:use`.

---

## 4. Không làm trong phase đầu tích hợp AI

- Không rewrite RAG.
- Không đổi embedding model.
- Không đổi LLM provider nếu không cần.
- Không re-index tài liệu nếu không có yêu cầu riêng.
- Không để Agent-AI làm ảnh hưởng dashboard/input/import.

---

## 5. Batch 10A - Inspect existing Agent-AI

Việc làm:

- Xác định route/UI chat hiện có.
- Xác định API chat hiện có.
- Xác định auth hiện tại của AI.
- Xác định component có thể tách/reuse.

Output:

```text
docs/phase10_agent_ai_audit.md
```

---

## 6. Batch 10B - Permission gate

Việc làm:

- Thêm menu AI theo `ai_agent:use`.
- Thêm route guard `/ai-agent/chat`.
- Nếu backend API AI chưa có guard, thêm guard hoặc proxy check permission.

Acceptance:

- User thiếu `ai_agent:use` không thấy menu AI.
- User thiếu quyền gọi API AI bị chặn.

---

## 7. Batch 10C - UI integration

Việc làm:

- Bọc chat UI trong `PortalLayout`.
- Đổi tên hiển thị: “Trợ lý AI”.
- Chỉnh CSS tránh tràn layout.
- Đồng bộ theme với QLCL Web.

---

## 8. Batch 10D - Testing and polish

Checklist:

```text
[ ] /ai-agent/chat vào được nếu có ai_agent:use
[ ] User thiếu quyền bị 403
[ ] Chat UI không tràn layout
[ ] Sidebar portal và sidebar chat không xung đột
[ ] API chat hoạt động nếu đã có backend
[ ] Không ảnh hưởng dashboard/input/import
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 10 - Agent-AI Integration Later.
Chỉ tích hợp Agent-AI như module phụ trong QLCL Web. Trước hết audit route/API/component AI hiện có và ghi docs/phase10_agent_ai_audit.md. Sau đó thêm permission gate ai_agent:use, menu Trợ lý AI, route /ai-agent/chat và bọc UI chat trong PortalLayout.
Không rewrite RAG, không đổi embedding/LLM, không re-index tài liệu, không làm ảnh hưởng các module QLCL đã có.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```
