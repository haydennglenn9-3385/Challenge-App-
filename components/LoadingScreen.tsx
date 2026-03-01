// components/LoadingScreen.tsx
export default function LoadingScreen() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes rainbowShift { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
      <div style={{
        minHeight: "100dvh", width: "100%",
        background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          height: 12, width: "100%",
          background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)",
          backgroundSize: "200% 100%",
          animation: "rainbowShift 4s linear infinite",
          flexShrink: 0,
        }} />
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <div style={{ fontSize: 52, animation: "pulse 1.5s ease-in-out infinite" }}>🏳️‍🌈</div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif" , fontSize: 18,
            color: "#7b2d8b", letterSpacing: 2,
          }}>
            LOADING...
          </div>
        </div>
      </div>
    </>
  );
}