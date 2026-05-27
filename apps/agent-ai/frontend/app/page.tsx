export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>AI Chatbot MVP</h1>
      <p>Hệ thống đang khởi động...</p>
      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Trạng thái Phase 0 & 1:</h3>
        <ul>
          <li>Backend API: Đang kiểm tra...</li>
          <li>Database: Đang kết nối...</li>
        </ul>
      </div>
    </main>
  )
}
