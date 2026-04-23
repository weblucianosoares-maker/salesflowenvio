import { LayoutDashboard, Users, CloudUpload, Megaphone, Monitor as MonitorIcon, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', path: '/leads', icon: Users },
  { name: 'Importar', path: '/import', icon: CloudUpload },
  { name: 'Campanhas', path: '/campaigns', icon: Megaphone },
  { name: 'Monitor', path: '/monitor', icon: MonitorIcon },
];

export function Sidebar() {
  return (
    <aside className="fixed h-screen w-64 left-0 top-0 border-r border-white/5 bg-[#0a0a0c] flex flex-col py-8 z-50">
      <div className="px-8 mb-12">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <span className="text-white font-bold text-xl italic">S</span>
          </div>
          <h1 className="text-white font-black tracking-tighter text-2xl">SalesFlow</h1>
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-metal-silver font-medium opacity-60">PRO BY EFRAIM</p>
      </div>

      <nav className="flex-1 space-y-2 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'text-white bg-primary/10 border border-primary/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={18} 
                  className={isActive ? 'text-primary' : 'group-hover:text-zinc-200'} 
                />
                <span className="text-sm font-medium tracking-tight">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 pt-6 mt-6 border-t border-white/5">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-zinc-500 hover:text-white transition-colors">
          <LogOut size={18} />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
