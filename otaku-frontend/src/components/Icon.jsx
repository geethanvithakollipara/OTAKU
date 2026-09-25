const P = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4 6l-2 6-6 2 2-6z",
  zones: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a2.5 2.5 0 1 0 0-5M2 20c0-3.3 3-5 7-5s7 1.7 7 5M17 15c2.8.2 5 1.6 5 4",
  library: "M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2l-4.3-4.3",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  mail: "M3 5h18v14H3zM3 7l9 6 9-6",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  back: "M15 5l-7 7 7 7",
  play: "M7 4l13 8-13 8z",
  chat: "M4 4h16v12H8l-4 4z",
};
export default function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
export function Logo({ size = 34 }) {
  return (
    <span className="logo-box" style={{ width: size, height: size }}>
      <Icon name="library" size={size * 0.6} />
    </span>
  );
}
