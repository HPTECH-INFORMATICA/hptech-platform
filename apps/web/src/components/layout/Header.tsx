export default function Header() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-8">
      <div className="font-semibold">
        HPTECH Clinic
      </div>

      <div className="flex items-center gap-4">
        <span>🔔</span>

        <div className="w-10 h-10 rounded-full bg-slate-300"></div>
      </div>
    </header>
  );
}
