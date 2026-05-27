# Bộ tài liệu chuyển hóa Agent-AI thành module phụ trong Web quản lý chỉ số chất lượng

## Mục tiêu bộ tài liệu

Bộ tài liệu này dùng để triển khai chuyển hóa hệ thống hiện có trên một máy chủ ảo Debian đang chạy Agent-AI/RAG thành một nền tảng web lớn hơn:

```text
Web quản lý chỉ số chất lượng Trung tâm
├── Dashboard chỉ số chất lượng
├── Nhập liệu báo cáo
├── ETL dữ liệu
├── Tính toán 53 chỉ số
├── Xuất báo cáo
└── Agent-AI trợ lý nội bộ
```

Nguyên tắc quan trọng: **không phá vỡ logic Agent-AI hiện tại**. Agent-AI được giữ lại như một nhánh/module phụ trong hệ thống mới, có thể đổi giao diện để đồng bộ với web lớn nhưng không thay đổi sâu vào RAG nếu không cần thiết.

## Danh sách file

| File | Mục đích |
|---|---|
| `01_BRD_Quality_Dashboard_With_AI_Agent.md` | Yêu cầu kinh doanh, phạm vi, mục tiêu, vai trò người dùng |
| `02_PRD_Quality_Dashboard_With_AI_Agent.md` | Yêu cầu sản phẩm, module, phase MVP, hành trình người dùng |
| `03_FRD_Quality_Dashboard_With_AI_Agent.md` | Yêu cầu chức năng chi tiết, API, database, quyền, dashboard |
| `04_IMPLEMENTATION_PLAN.md` | Kế hoạch triển khai theo giai đoạn, mốc thời gian, đầu ra |
| `05_ARCHITECTURE_BRANCHING_STRATEGY.md` | Chiến lược phân nhánh logic để không ảnh hưởng Agent-AI cũ |
| `06_CODEX_IMPLEMENTATION_NOTES.md` | Ghi chú/prompt chi tiết đưa cho Codex thực hiện |

## Hướng triển khai khuyến nghị

1. Không đổi ngay cấu trúc đang chạy của Agent-AI.
2. Tạo layout web lớn mới, giữ `/chat` hoặc chuyển dần thành `/ai-agent` qua route alias.
3. Tạo các module mới tách riêng: `/quality`, `/reports`, `/etl`, `/indicators`, `/dashboard`.
4. Tách schema database nghiệp vụ chỉ số khỏi schema RAG hiện tại.
5. Python tiếp tục phụ trách ETL, calculation engine và job nền.
6. JavaScript/TypeScript phụ trách giao diện, dashboard, phân quyền và trải nghiệm người dùng.
7. Chạy song song Power BI và web mới ít nhất 1-2 kỳ báo cáo để đối chiếu.

## Quy ước thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Agent-AI | Module chatbot/RAG hiện tại |
| Quality Dashboard | Web quản lý chỉ số chất lượng mới |
| ETL Engine | Python xử lý thu thập, làm sạch, chuẩn hóa dữ liệu |
| Calculation Engine | Python tính biến A/B/C/D/E và 53 chỉ số CS1-CS53 |
| Module phụ | Agent-AI được đặt trong hệ thống lớn, không còn là app độc lập chính |
