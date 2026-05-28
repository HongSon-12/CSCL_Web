# BRD - Tài liệu Yêu cầu Kinh doanh
## Dự án: Chatbot AI Trợ lý Nội bộ - Complete Phased Local Storage MVP

**Phiên bản:** 3.0  
**Ngày:** 05/05/2026  
**Môi trường mục tiêu:** 01 máy chủ Debian + Docker Compose + Local Storage + PostgreSQL/pgvector  
**Quy mô người dùng:** 230 nhân viên, giả định ban đầu 20% active/ngày = 46 người/ngày  
**File chi phí riêng:** `Cost_Model_Comparison.md`

---

## 1. Tóm tắt dự án

Dự án xây dựng một hệ thống **Chatbot AI nội bộ** giúp nhân viên tra cứu thông tin từ khoảng **400 file DOCX/PDF** bằng ngôn ngữ tự nhiên. Hệ thống sử dụng kiến trúc RAG: tài liệu được chuyển đổi thành Markdown/Text, cắt thành chunk, tạo embedding, lưu vào PostgreSQL/pgvector, sau đó truy xuất Top K chunk liên quan để LLM trả lời.

Trong MVP, hệ thống chạy trên **một máy chủ Debian**, dùng **Docker Compose**, lưu file bằng **local storage**, chưa dùng Google Drive, MinIO, Qdrant, Kubernetes hoặc cloud storage. Upload UI sẽ nằm ở Phase 5, sau khi pipeline RAG và chat ổn định.

---

## 2. Bối cảnh và vấn đề

Đơn vị có nhiều tài liệu quy trình, quy định, hướng dẫn, biểu mẫu ở dạng DOCX/PDF. Khi nhân viên cần tra cứu, họ phải mở từng file hoặc hỏi người phụ trách. Điều này gây ra:

- Mất thời gian tìm kiếm.
- Dễ dùng nhầm tài liệu cũ.
- Khó biết câu trả lời lấy từ nguồn nào.
- Khó đào tạo nhân sự mới.
- Tri thức nghiệp vụ phụ thuộc vào một số cá nhân.
- Nếu mở AI không kiểm soát, AI có thể trả lời ngoài tài liệu.

---

## 3. Mục tiêu kinh doanh

| Mã | Mục tiêu | KPI đề xuất |
|---|---|---|
| OBJ-01 | Giảm thời gian tra cứu tài liệu | Giảm 60-80% thời gian tìm kiếm thông tin phổ biến |
| OBJ-02 | Tăng tính nhất quán câu trả lời | 90% câu trả lời có nguồn tài liệu đi kèm |
| OBJ-03 | Kiểm soát rủi ro AI bịa | Nếu không có context phù hợp, AI trả lời không tìm thấy thông tin |
| OBJ-04 | Sẵn sàng mở rộng cho 230 nhân viên | Pilot với 20% nhân viên active/ngày, sau đó mở rộng |
| OBJ-05 | Kiểm soát chi phí API | Có log token, cost estimate, giới hạn người dùng/ngày |
| OBJ-06 | Chuẩn hóa quy trình tài liệu | Có versioning, review, active/archive ở Phase 5 |

---

## 4. Phạm vi dự án

### 4.1 Trong phạm vi MVP

- Hạ tầng Docker Compose trên 1 server Debian.
- Local storage để lưu file gốc và file đã chuẩn hóa.
- PostgreSQL + pgvector để lưu metadata, chunk, vector, chat log.
- Pipeline nạp khoảng 400 file DOCX/PDF bằng script/admin kỹ thuật.
- Convert DOCX/PDF sang Markdown/Text.
- Chunking, embedding, semantic search.
- Tích hợp LLM API: ưu tiên Gemini Flash; kiến trúc cho phép đổi provider sau.
- Web chat hoặc widget cơ bản cho người dùng.
- RBAC backend cơ bản.
- Log nguồn tài liệu, token, lỗi xử lý.

### 4.2 Ngoài phạm vi MVP

- Upload UI cho nhiều người dùng.
- Google Drive connector.
- MinIO/S3/object storage.
- Qdrant/Weaviate/Pinecone.
- Kubernetes.
- OCR nâng cao cho PDF scan.
- Voice bot, Zalo/Teams/Telegram bot.
- Local LLM làm model chính production.

---

## 5. Roadmap phase

| Phase | Tên phase | Mục tiêu chính | Kết quả bàn giao |
|---|---|---|---|
| Phase 0 | Chuẩn bị nền tảng | Chuẩn hóa server, Docker, repo, DB, storage | Debian + Docker Compose chạy được backend/frontend/worker/postgres/nginx |
| Phase 1 | Phân quyền người dùng nền tảng | Xây RBAC backend trước khi mở cho nhân viên | users/roles/permissions, middleware, seed role Admin/Contributor/End-user |
| Phase 2 | Setup RAG tiếp nhận & chuyển hóa DOCX/PDF | Nạp khoảng 400 file, convert, chunk, embedding, search | Pipeline index local, PostgreSQL + pgvector, search Top K |
| Phase 3A | Setup API LLM để trả lời theo prompt | Kết nối Gemini/API provider, prompt builder, chống ảo giác | API chat trả lời theo context, có nguồn, có log token |
| Phase 3B | Trang người dùng chat Web/Widget | Cho nhân viên hỏi đáp qua web/widget | UI chat, source citation, history, feedback cơ bản |
| Phase 4 | Trang phân quyền người dùng | Admin quản lý user/role/permission bằng UI | User list, user detail, role permission matrix, audit log |
| Phase 5 | Trang thêm mới hoặc cập nhật tài liệu | Upload UI riêng, không qua Drive/MinIO | Upload mới, thay thế bản cũ, review, versioning, re-index |
| Phase sau MVP | Tối ưu vận hành | Dashboard, backup nâng cao, model routing, local LLM test | Báo cáo usage/cost, feedback quality, mở rộng khi cần |


---

## 6. Nguyên tắc kiến trúc kinh doanh

### 6.1 Local storage là kho chính trong MVP

Lý do:

- Hệ thống chạy trên 1 máy chủ.
- Dễ triển khai, backup, debug.
- Không phát sinh chi phí dịch vụ lưu trữ.
- Không phụ thuộc Google Drive/MinIO.
- Phù hợp khi chưa mở upload cho nhiều người.

Cấu trúc storage:

```txt
/opt/ai-chatbot/storage/
├── original/      # File gốc DOCX/PDF
├── normalized/    # Markdown đã chuyển đổi
├── extracted/     # JSON metadata/bảng/heading
└── temp/          # File tạm
```

### 6.2 PostgreSQL + pgvector là lõi dữ liệu

PostgreSQL lưu user, role, permission, metadata tài liệu, version tài liệu, chunk text, embedding vector, lịch sử chat, retrieval log và API usage log.

### 6.3 Không parse file khi người dùng hỏi

Khi user chat, hệ thống không đọc lại DOCX/PDF. Hệ thống chỉ embedding câu hỏi, search pgvector, lấy Top K chunks, build prompt và gọi LLM. Cách này giúp phản hồi nhanh và giảm chi phí API.

---

## 7. Người dùng và vai trò

| Vai trò | Mô tả | Phase |
|---|---|---|
| End-user | Nhân viên hỏi chatbot | Phase 3B |
| Admin kỹ thuật | Người setup server, nạp file, chạy index | Phase 0-2 |
| System Admin | Quản lý người dùng/quyền | Phase 4 |
| Contributor | Người được phép đề xuất upload/cập nhật tài liệu | Phase 5 |
| Reviewer/Admin tài liệu | Người duyệt tài liệu trước khi AI dùng | Phase 5 |

---

## 8. Ước lượng sử dụng ban đầu

| Chỉ số | Giá trị |
|---|---:|
| Tổng nhân viên | 230 |
| Tỷ lệ active/ngày giai đoạn đầu | 20% |
| Người dùng active/ngày | 46 |
| Câu hỏi/người/ngày | 5 |
| Tổng câu hỏi/ngày | 230 |
| Tổng câu hỏi/tháng | 6.900 |

Chi tiết chi phí model, token, khuyến nghị mua API nằm trong `Cost_Model_Comparison.md`.

---

## 9. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| AI trả lời sai/bịa | Mất niềm tin, ảnh hưởng nghiệp vụ | Anti-hallucination prompt, similarity threshold, source citation |
| Dùng nhầm bản tài liệu cũ | Sai quy trình | Data model có `document_versions`, chỉ search bản `active` |
| Chi phí API tăng | Vượt ngân sách | Token log, giới hạn Top K, giới hạn output, model routing |
| Free tier API bị rate limit | Demo/pilot gián đoạn | Dùng free cho dev, bật paid khi pilot thật |
| File PDF scan không trích xuất tốt | Thiếu dữ liệu | MVP ưu tiên DOCX/PDF text; OCR để phase sau |
| Một server bị hỏng | Mất dịch vụ | Backup PostgreSQL + storage định kỳ |

---

## 10. Chỉ số thành công

| Nhóm | Chỉ số |
|---|---|
| Sử dụng | Số user active/ngày, số câu hỏi/ngày |
| Chất lượng | Tỷ lệ câu trả lời có nguồn, feedback hữu ích |
| Hiệu năng | P95 response time < 8 giây với câu hỏi chuẩn |
| Chi phí | Chi phí API/tháng nằm trong ngân sách dự kiến |
| Vận hành | Tỷ lệ job index thành công > 95% |
| Dữ liệu | 400 file được convert/index thành công trong Phase 2 |

---

## 11. Khuyến nghị kinh doanh cuối

Nên triển khai MVP theo hướng:

```txt
1 server Debian
+ Docker Compose
+ Local storage
+ PostgreSQL/pgvector
+ Backend/worker
+ Gemini Flash hoặc model API tương đương
+ Web chat
```

Không nên mở upload cho nhiều người ngay. Sau khi chatbot trả lời ổn từ 400 tài liệu ban đầu, triển khai Phase 5: **Upload UI riêng**, gồm upload mới, thay thế tài liệu cũ, versioning và duyệt tài liệu.

---

## Tài liệu tham khảo chính thức

- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini API models: https://ai.google.dev/gemini-api/docs/models
- OpenAI API pricing/models: https://developers.openai.com/api/docs/pricing
- OpenAI GPT-4.1 mini model: https://developers.openai.com/api/docs/models/gpt-4.1-mini
- OpenAI GPT-5 mini model: https://developers.openai.com/api/docs/models/gpt-5-mini
- OpenAI text-embedding-3-small: https://developers.openai.com/api/docs/models/text-embedding-3-small
- Anthropic Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Docker volumes: https://docs.docker.com/engine/storage/volumes/
- pgvector: https://github.com/pgvector/pgvector
- Ollama Docker/local model: https://github.com/ollama/ollama
- Qwen3: https://github.com/QwenLM/qwen3

