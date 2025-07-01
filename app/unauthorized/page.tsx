export default function Unauthorized() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'Poppins, sans-serif' }}>
      <h2 style={{ color: '#d32f2f', fontWeight: 700, fontSize: '2rem', marginBottom: '1rem' }}>🚫 You are not authorized to view this page.</h2>
      <p style={{ color: '#555', fontSize: '1.1rem' }}>If you believe this is a mistake, please contact your administrator.</p>
    </div>
  );
} 