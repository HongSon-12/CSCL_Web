import os
import re
import time
import hashlib
import docx
import fitz  # PyMuPDF
from typing import List
from dotenv import load_dotenv

load_dotenv()

# Lazy-load embedding backends to avoid slow startup
_local_model = None

def _get_local_model():
    """Load BAAI/bge-m3 model once and cache it."""
    global _local_model
    if _local_model is None:
        from sentence_transformers import SentenceTransformer
        model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
        cache_dir = os.getenv("HF_HOME", "/app/storage/models")
        print(f"Loading local embedding model: {model_name} (cache: {cache_dir})")
        _local_model = SentenceTransformer(model_name, cache_folder=cache_dir)
        print("Local embedding model loaded successfully.")
    return _local_model

def get_file_checksum(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def convert_docx_to_markdown(file_path: str) -> str:
    doc = docx.Document(file_path)
    md_content = []
    for para in doc.paragraphs:
        if para.style.name.startswith('Heading'):
            level = para.style.name.split()[-1]
            if level.isdigit():
                md_content.append(f"{'#' * int(level)} {para.text}")
            else:
                md_content.append(f"# {para.text}")
        else:
            md_content.append(para.text)
    return "\n\n".join(md_content)

def convert_pdf_to_markdown(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 150) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - chunk_overlap
    return chunks

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []

    provider = os.getenv("EMBEDDING_PROVIDER", "local").lower()
    model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
    print(f"Generating embeddings via provider={provider}, model={model_name}")

    if provider == "local":
        return _generate_local_embeddings(texts, model_name)
    else:
        return _generate_gemini_embeddings(texts, model_name)

def _generate_local_embeddings(texts: List[str], model_name: str) -> List[List[float]]:
    """Generate embeddings using a local SentenceTransformer model (e.g. BAAI/bge-m3)."""
    model = _get_local_model()
    # encode() returns numpy arrays; convert to plain Python lists for pgvector
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return [v.tolist() for v in vectors]

def _generate_gemini_embeddings(texts: List[str], model_name: str) -> List[List[float]]:
    """Generate embeddings using Gemini API with automatic rate-limit retry."""
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

    def flatten_to_1d(data):
        if isinstance(data, dict) and 'values' in data:
            data = data['values']
        while isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
            data = data[0]
        return data

    max_retries = 5
    for attempt in range(max_retries):
        try:
            result = genai.embed_content(
                model=model_name,
                content=texts,
                task_type="retrieval_document"
            )
            if 'embeddings' in result:
                return [flatten_to_1d(e) for e in result['embeddings']]
            elif 'embedding' in result:
                return [flatten_to_1d(result['embedding'])]
            return []
        except Exception as e:
            error_str = str(e)
            if '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str:
                wait_time = 65
                match = re.search(r'retry_delay \{\s*seconds: (\d+)', error_str)
                if match:
                    wait_time = int(match.group(1)) + 5
                print(f"Rate limit hit. Waiting {wait_time}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(wait_time)
            else:
                print(f"Gemini embedding error: {error_str}")
                raise e

    raise Exception(f"Gemini embedding failed after {max_retries} retries.")
