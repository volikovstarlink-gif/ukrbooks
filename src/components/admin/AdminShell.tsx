import Sidebar from './Sidebar';
import GlobalAlert from './GlobalAlert';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0f172a] text-white flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalAlert />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
