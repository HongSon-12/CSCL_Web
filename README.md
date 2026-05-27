# CSCL Web

Repo triển khai Web quản lý chỉ số chất lượng tích hợp Agent-AI cho Trung tâm Cấp cứu 115 TP.HCM.

## Mục tiêu

Xây dựng portal web quản lý chỉ số chất lượng, dashboard, nhập liệu, ETL, xuất báo cáo và đưa Agent-AI hiện tại thành module phụ. Nguyên tắc chính là mở rộng có kiểm soát, không phá hệ thống Agent-AI đang chạy.

## Cấu trúc

```text
CSCL_Web/
├── apps/
│   └── agent-ai/              # Snapshot code Agent-AI hiện tại để mở rộng theo phase
├── docs/
│   ├── plan/                  # BRD, PRD, FRD, implementation plan, architecture
│   ├── data-catalog/          # Catalog bảng/cột/measure từ dashboard hiện có
│   └── legacy-agent-ai/       # Tài liệu thiết kế hệ Agent-AI cũ
└── README.md
```

## Không còn dùng

`dashboard115-demo` đã được loại khỏi repo này và đã dừng container demo riêng. Module dashboard thật sẽ được triển khai theo plan, đọc PostgreSQL hiện có thay vì tạo database mới.

File cấu hình DB dashboard hiện có nằm ngoài repo tại:

```text
/home/sonnguyen/Docx_plan/.env.dashboard
```

Không commit file `.env.dashboard` thật lên GitHub.

## Tài liệu bắt đầu

Đọc theo thứ tự:

1. `docs/plan/README.md`
2. `docs/plan/01_BRD_Quality_Dashboard_With_AI_Agent.md`
3. `docs/plan/02_PRD_Quality_Dashboard_With_AI_Agent.md`
4. `docs/plan/03_FRD_Quality_Dashboard_With_AI_Agent.md`
5. `docs/plan/04_IMPLEMENTATION_PLAN.md`
6. `docs/plan/05_ARCHITECTURE_BRANCHING_STRATEGY.md`
7. `docs/plan/06_CODEX_IMPLEMENTATION_NOTES.md`

## Việc làm ngay

1. Baseline hệ thống Agent-AI đang chạy.
2. Tạo branch `feature/quality-dashboard-portal`.
3. Tạo portal shell trong `apps/agent-ai/frontend`.
4. Giữ route `/chat`, thêm route `/ai-agent/chat`.
5. Tạo schema/bảng `quality_*` tách khỏi bảng RAG.
6. Dùng `docs/data-catalog` để chuyển measure Power BI/DAX sang Python calculation engine.

## Git remote

Remote mục tiêu:

```text
https://github.com/HongSon-12/CSCL_Web.git
```

