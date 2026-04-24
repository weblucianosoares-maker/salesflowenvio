import { LayoutDashboard, Users, CloudUpload, Megaphone, Monitor as MonitorIcon, LogOut, ChevronLeft, ChevronRight, Inbox as InboxIcon, Filter } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', path: '/leads', icon: Users },
  { name: 'Funil de Vendas', path: '/funnel', icon: Filter },
  { name: 'Importar', path: '/import', icon: CloudUpload },
  { name: 'Campanhas', path: '/campaigns', icon: Megaphone },
  { name: 'Caixa de E-mails', path: '/inbox', icon: InboxIcon },
  { name: 'Monitor', path: '/monitor', icon: MonitorIcon },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`fixed h-screen transition-all duration-300 left-0 top-0 border-r border-white/5 bg-[#0a0a0c] flex flex-col py-8 z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <button 
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white border-4 border-background hover:scale-110 transition-all z-[60]"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`px-6 mb-12 overflow-hidden transition-all duration-300 ${isCollapsed ? 'px-4' : 'px-8'}`}>
        <div className="flex items-center gap-3 mb-1">
          <div className="min-w-[32px] w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <span className="text-white font-bold text-xl italic">S</span>
          </div>
          {!isCollapsed && (
            <h1 className="text-white font-black tracking-tighter text-2xl truncate animate-in fade-in slide-in-from-left-2">SalesFlow</h1>
          )}
        </div>
        {!isCollapsed && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-metal-silver font-medium opacity-60 truncate animate-in fade-in slide-in-from-left-2">PRO BY EFRAIM</p>
        )}
      </div>

      <nav className="flex-1 space-y-2 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'text-white bg-primary/10 border border-primary/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
              } ${isCollapsed ? 'justify-center px-0' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={18} 
                  className={isActive ? 'text-primary' : 'group-hover:text-zinc-200'} 
                />
                {!isCollapsed && <span className="text-sm font-medium tracking-tight animate-in fade-in slide-in-from-left-2">{item.name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 pt-6 mt-6 border-t border-white/5 overflow-hidden">
        <button className={`flex items-center gap-3 px-4 py-3 w-full text-zinc-500 hover:text-white transition-colors ${isCollapsed ? 'justify-center px-0' : ''}`}>
          <LogOut size={18} />
          {!isCollapsed && <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
