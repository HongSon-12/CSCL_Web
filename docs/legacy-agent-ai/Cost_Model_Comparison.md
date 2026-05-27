# Cost_Model_Comparison.md
## Bảng chi phí, lựa chọn model và khuyến nghị hạ tầng

**Phiên bản:** 3.0  
**Ngày:** 05/05/2026  
**Áp dụng cho:** Chatbot AI nội bộ, 230 nhân viên, MVP local storage trên 01 máy chủ Debian.

---

## 1. Giả định tính toán

| Thông số | Giá trị |
|---|---:|
| Tổng nhân viên | 230 |
| Tỷ lệ active/ngày ban đầu | 20% |
| Người dùng active/ngày | 46 |
| Câu hỏi/người/ngày | 5 |
| Tổng câu hỏi/ngày | 230 |
| Tổng câu hỏi/tháng, 30 ngày | 6.900 |

Kịch bản token mỗi câu:

| Kịch bản | Input token/câu | Output token/câu | Ý nghĩa |
|---|---:|---:|---|
| Nhẹ | 2.000 | 500 | FAQ ngắn, Top K ít, answer ngắn |
| Chuẩn | 4.000 | 800 | RAG nội bộ phổ biến |
| Cao | 7.000 | 1.500 | Context dài, answer dài hơn |

---

## 2. Bảng giá tham khảo theo provider

| Provider | Model | Input USD/1M token | Output USD/1M token | Ghi chú |
|---|---|---:|---:|---|
| Google | Gemini 2.5 Flash-Lite | 0.10 | 0.40 | Rẻ nhất trong nhóm Gemini stable 2.5 |
| Google | Gemini 2.5 Flash | 0.30 | 2.50 | Cân bằng chất lượng/giá cho RAG |
| OpenAI | GPT-5 mini | 0.25 | 2.00 | Lựa chọn tốt ngoài Gemini |
| OpenAI | GPT-4.1 mini | 0.40 | 1.60 | Context lớn, output rẻ hơn GPT-5 mini |
| Anthropic | Claude Haiku 4.5 | 1.00 | 5.00 | Trả lời tự nhiên, chi phí cao hơn |
| Anthropic | Claude Sonnet 4.6 | 3.00 | 15.00 | Chỉ dùng tác vụ khó/quan trọng |
| Local | Qwen/Llama/Mistral qua Ollama | 0 | 0 | Không tốn token API nhưng cần phần cứng mạnh hơn |

Nguồn giá nên kiểm tra lại trước khi mua/bật billing vì giá có thể thay đổi theo thời gian.

---

## 3. Ước tính chi phí chat hằng tháng

| Kịch bản | Model | Input token/câu | Output token/câu | Input M token/tháng | Output M token/tháng | Ước tính USD/tháng |
| --- | --- | --- | --- | --- | --- | --- |
| Nhẹ | Gemini 2.5 Flash-Lite | 2000 | 500 | 13.8 | 3.45 | 2.76 |
| Nhẹ | Gemini 2.5 Flash | 2000 | 500 | 13.8 | 3.45 | 12.77 |
| Nhẹ | OpenAI GPT-5 mini | 2000 | 500 | 13.8 | 3.45 | 10.35 |
| Nhẹ | OpenAI GPT-4.1 mini | 2000 | 500 | 13.8 | 3.45 | 11.04 |
| Nhẹ | Claude Haiku 4.5 | 2000 | 500 | 13.8 | 3.45 | 31.05 |
| Nhẹ | Claude Sonnet 4.6 | 2000 | 500 | 13.8 | 3.45 | 93.15 |
| Chuẩn | Gemini 2.5 Flash-Lite | 4000 | 800 | 27.6 | 5.52 | 4.97 |
| Chuẩn | Gemini 2.5 Flash | 4000 | 800 | 27.6 | 5.52 | 22.08 |
| Chuẩn | OpenAI GPT-5 mini | 4000 | 800 | 27.6 | 5.52 | 17.94 |
| Chuẩn | OpenAI GPT-4.1 mini | 4000 | 800 | 27.6 | 5.52 | 19.87 |
| Chuẩn | Claude Haiku 4.5 | 4000 | 800 | 27.6 | 5.52 | 55.2 |
| Chuẩn | Claude Sonnet 4.6 | 4000 | 800 | 27.6 | 5.52 | 165.6 |
| Cao | Gemini 2.5 Flash-Lite | 7000 | 1500 | 48.3 | 10.35 | 8.97 |
| Cao | Gemini 2.5 Flash | 7000 | 1500 | 48.3 | 10.35 | 40.36 |
| Cao | OpenAI GPT-5 mini | 7000 | 1500 | 48.3 | 10.35 | 32.77 |
| Cao | OpenAI GPT-4.1 mini | 7000 | 1500 | 48.3 | 10.35 | 35.88 |
| Cao | Claude Haiku 4.5 | 7000 | 1500 | 48.3 | 10.35 | 100.05 |
| Cao | Claude Sonnet 4.6 | 7000 | 1500 | 48.3 | 10.35 | 300.15 |


### Nhận xét nhanh

- Gemini 2.5 Flash-Lite, kịch bản chuẩn: khoảng **5 USD/tháng**.
- Gemini 2.5 Flash, kịch bản chuẩn: khoảng **22 USD/tháng**.
- OpenAI GPT-5 mini, kịch bản chuẩn: khoảng **18 USD/tháng**.
- OpenAI GPT-4.1 mini, kịch bản chuẩn: khoảng **20 USD/tháng**.
- Claude Haiku 4.5, kịch bản chuẩn: khoảng **55 USD/tháng**.
- Claude Sonnet nên để làm model nâng cao, không dùng mặc định nếu ngân sách hạn chế.

---

## 4. Chi phí embedding cho 400 file

Giả định tổng token sau khi convert 400 file nằm trong 2M-20M token tùy độ dài tài liệu.

| Khối lượng index | Model embedding | Đơn giá | Chi phí index/re-index |
| --- | --- | --- | --- |
| 2M token | Gemini Embedding | $0.15/1M token | $0.30 |
| 2M token | OpenAI text-embedding-3-small | $0.02/1M token | $0.04 |
| 2M token | Local embedding | $0.0/1M token | $0.00 |
| 8M token | Gemini Embedding | $0.15/1M token | $1.20 |
| 8M token | OpenAI text-embedding-3-small | $0.02/1M token | $0.16 |
| 8M token | Local embedding | $0.0/1M token | $0.00 |
| 20M token | Gemini Embedding | $0.15/1M token | $3.00 |
| 20M token | OpenAI text-embedding-3-small | $0.02/1M token | $0.40 |
| 20M token | Local embedding | $0.0/1M token | $0.00 |


### Nhận xét

- Chi phí embedding ban đầu thường thấp hơn nhiều so với chi phí chat.
- OpenAI `text-embedding-3-small` rất rẻ.
- Gemini embedding vẫn chấp nhận được nếu muốn cùng hệ Google.
- Local embedding không tốn API nhưng cần test chất lượng tiếng Việt và tốn tài nguyên máy chủ.

---

## 5. Khuyến nghị model theo giai đoạn

| Giai đoạn | Chat model | Embedding model | Lý do |
|---|---|---|---|
| Dev cá nhân | Gemini 2.5 Flash free tier | Gemini embedding hoặc OpenAI embedding | Dễ bắt đầu |
| MVP kỹ thuật | Gemini 2.5 Flash | Gemini embedding | Ít thay đổi provider, dễ debug |
| Pilot 20-50 người | Gemini Flash hoặc OpenAI GPT-5 mini | OpenAI text-embedding-3-small hoặc Gemini embedding | Bật billing, log token |
| Production 230 người | Gemini Flash làm mặc định, Flash-Lite cho câu đơn giản | OpenAI text-embedding-3-small nếu ưu tiên rẻ | Cân bằng chi phí/chất lượng |
| Tác vụ quan trọng | Claude Haiku/Sonnet hoặc model nâng cao | Không bắt buộc đổi embedding | Chỉ dùng theo route đặc biệt |
| Thử nghiệm local | Qwen 8B/14B qua Ollama | Qwen3 Embedding/BGE-M3 | Không dùng làm mặc định nếu chưa có GPU |

---

## 6. Khuyến nghị cuối về model

### Phương án khuyên dùng nhất cho MVP

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
```

Lý do: bạn đã quen Gemini, Flash đủ tốt cho RAG nội bộ và ít provider hơn nên dễ triển khai MVP.

### Phương án tối ưu chi phí ngoài Gemini

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-5-mini
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

Lý do: embedding rất rẻ, chat cost cạnh tranh và API ổn cho production.

### Phương án tiết kiệm nhất

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash-lite
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

Cần test chất lượng trước khi dùng rộng.

---

## 7. Khi nào nên bật paid API?

### Có thể dùng free tier khi
- Chỉ 1-5 người test.
- Dưới 50 câu/ngày.
- Chấp nhận lỗi rate limit.
- Chưa demo chính thức.

### Nên bật paid khi
- Pilot cho 20-50 người.
- Trên 100-200 câu/ngày.
- Cần demo ổn định.
- Cần index/re-index nhiều file.
- Cần log chi phí và kiểm soát ngân sách.

### Nên mua/bật billing ngay khi
- Mở cho toàn bộ 230 nhân viên.
- Có SLA nội bộ.
- Chatbot được dùng trong công việc thật.
- Cần tránh gián đoạn do quota free.

---

## 8. Token management để giảm chi phí

| Biện pháp | Cấu hình đề xuất |
|---|---|
| Top K retrieval | 3-5 chunks |
| Chunk size | 800-1.000 token |
| Chunk overlap | 100-150 token |
| Chat history | 4-6 lượt gần nhất |
| Max output | 800-1.200 token |
| Similarity threshold | Không trả lời nếu context yếu |
| Prompt | Ngắn, rõ luật, không nhồi quá nhiều |
| Cache | Cache embedding tài liệu theo checksum |
| Routing | Câu đơn giản dùng Flash-Lite, câu khó dùng Flash |

---

## 9. Khuyến nghị phần cứng

### Nếu dùng cloud API LLM/embedding

| Mức | CPU | RAM | Disk | GPU | Ghi chú |
|---|---:|---:|---:|---|---|
| Tối thiểu | 4 vCPU | 8GB | SSD 100GB | Không cần | Dev/test |
| Khuyến nghị MVP | 6-8 vCPU | 16GB | SSD/NVMe 200-300GB | Không cần | 400 file, 46 active user/ngày |
| Pilot ổn định | 8 vCPU | 32GB | SSD/NVMe 500GB | Không cần | Dư địa logs/backup/job |
| Production 1 server | 8-12 vCPU | 32GB | SSD/NVMe 500GB-1TB | Không cần | 230 nhân viên, backup tốt |

### Nếu muốn chạy local LLM

| Mức | CPU/RAM/GPU | Ghi chú |
|---|---|---|
| 7B/8B CPU-only | 8 vCPU, 16-32GB RAM | Chạy được nhưng chậm nếu nhiều user |
| 14B CPU-only | 12-16 vCPU, 32-64GB RAM | Không khuyên dùng làm model chính |
| 7B/8B GPU | GPU 8-12GB VRAM | Tốt hơn CPU nhiều |
| 14B GPU | GPU 16-24GB VRAM | Có thể thử nghiệm nghiêm túc |
| 32B GPU | GPU 24GB+ VRAM | Chi phí phần cứng tăng rõ |

Kết luận: MVP **không cần GPU** nếu dùng Gemini/OpenAI/Claude API.

---

## 10. Chi phí hạ tầng local

| Hạng mục | Chi phí phần mềm |
|---|---|
| Debian | Miễn phí |
| Docker/Docker Compose | Miễn phí |
| PostgreSQL | Miễn phí |
| pgvector | Miễn phí |
| Nginx | Miễn phí |
| Local storage | Theo chi phí ổ cứng/server |
| Backup local | Theo dung lượng ổ cứng |
| Gemini/OpenAI/Claude API | Tính theo token |

---

## 11. Rủi ro chi phí

| Rủi ro | Cách kiểm soát |
|---|---|
| Prompt quá dài | Giới hạn Top K, chunk size, history |
| Người dùng hỏi quá nhiều | Rate limit/user/day |
| Output quá dài | Set max output tokens |
| Re-index lặp lại | Dùng checksum/cache |
| Dùng model đắt mặc định | Model routing, model config |
| Không log token | Bắt buộc ghi `api_usage_logs` |

---

## 12. Kết luận

Khuyến nghị thực tế nhất:

```txt
MVP:
- Gemini 2.5 Flash cho chat
- Gemini embedding hoặc OpenAI text-embedding-3-small
- Free tier để dev
- Paid API khi pilot thật

Production tiết kiệm:
- Gemini Flash-Lite hoặc OpenAI GPT-5 mini cho câu phổ thông
- Gemini Flash cho câu cần chất lượng hơn
- Claude chỉ dùng cho tác vụ nâng cao
```

Nếu chọn một combo để bắt đầu ngay:

```txt
Gemini 2.5 Flash + Gemini Embedding
```

Nếu chọn combo tối ưu chi phí ngoài Gemini:

```txt
OpenAI GPT-5 mini + OpenAI text-embedding-3-small
```

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

