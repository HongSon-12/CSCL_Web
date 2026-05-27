import os
import google.generativeai as genai
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_embedding(text: str) -> List[float]:
    model = os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-2")
    result = genai.embed_content(
        model=model,
        content=text,
        task_type="retrieval_query"
    )
    return result['embeddings']

def search_chunks(db: Session, query: str, limit: int = 5) -> List[Dict]:
    query_embedding = get_embedding(query)
    
    # Use pgvector distance operator <=> (cosine distance)
    # We join with document_versions and documents to get file names and titles
    sql = text("""
        SELECT 
            c.content_md, 
            c.chunk_metadata,
            v.file_name,
            d.title,
            d.document_type,
            1 - (e.embedding <=> :embedding) AS similarity
        FROM document_chunks c
        JOIN document_embeddings e ON c.id = e.chunk_id
        JOIN document_versions v ON c.document_version_id = v.id
        JOIN documents d ON c.document_id = d.id
        WHERE c.status = 'active'
        ORDER BY e.embedding <=> :embedding
        LIMIT :limit
    """)
    
    results = db.execute(sql, {"embedding": str(query_embedding), "limit": limit}).fetchall()
    
    search_results = []
    for row in results:
        search_results.append({
            "content": row.content_md,
            "source": row.file_name,
            "document_title": row.title,
            "type": row.document_type,
            "score": float(row.similarity)
        })
    return search_results

def generate_answer(query: str, context_chunks: List[Dict], chat_history: List[Dict] = None) -> str:
    model_name = os.getenv("LLM_MODEL", "gemini-2.0-flash")
    model = genai.GenerativeModel(model_name)
    
    # Construct context string
    context_text = "\n\n".join([
        f"--- NGUỒN: {c['source']} ({c['type']}) ---\n{c['content']}" 
        for c in context_chunks
    ])
    
    system_instruction = f"""
Bạn là Trợ lý AI nội bộ của Trung tâm Cấp cứu 115 Thành phố Hồ Chí Minh. 
Nhiệm vụ của bạn là trả lời câu hỏi của nhân viên dựa TRỰC TIẾP và CHỈ dựa trên ngữ cảnh được cung cấp dưới đây.

QUY TẮC QUAN TRỌNG:
1. Chỉ sử dụng thông tin trong phần "NGỮ CẢNH CUNG CẤP". 
2. Nếu ngữ cảnh không chứa thông tin để trả lời, hãy lịch sự trả lời rằng bạn không biết hoặc thông tin này không nằm trong tài liệu nội bộ, tuyệt đối không tự bịa ra câu trả lời.
3. Luôn trích dẫn tên file nguồn ở cuối câu trả lời nếu thông tin lấy từ đó.
4. Trả lời bằng tiếng Việt, phong cách chuyên nghiệp, chính xác.

NGỮ CẢNH CUNG CẤP:
{context_text}
"""
    
    # For MVP, we pass context as part of the prompt
    full_prompt = f"{system_instruction}\n\nCÂU HỎI CỦA NGƯỜI DÙNG: {query}"
    
    response = model.generate_content(full_prompt)
    return response.text
