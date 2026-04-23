import { Activity, CheckCircle2, Clock, AlertCircle, Search, Filter } from 'lucide-react';

export function Monitorar() {
  return (
    <div className="p-8 text-white min-h-screen bg-background pt-20 premium-gradient">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Monitor de Disparo</h2>
          <p className="text-metal-silver font-medium opacity-60">Acompanhamento em tempo real da fila de envio e entregabilidade.</p>
        </div>
        <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Motor Ativo</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-xs text-zinc-500">Próximo ciclo em: <span className="text-white font-mono">08:42</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Na Fila', value: '1.420', icon: Clock, color: 'text-blue-400' },
          { label: 'Enviados (Hoje)', value: '458', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Falhas', value: '12', icon: AlertCircle, color: 'text-red-400' },
          { label: 'Taxa de Entrega', value: '98.2%', icon: Activity, color: 'text-primary' },
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon size={18} className={stat.color} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="glass rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            Log de Atividade Recente
          </h3>
          <div className="flex gap-2">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
               <input type="text" placeholder="Buscar lead..." className="bg-white/5 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-primary w-64" />
             </div>
             <button className="glass p-2 rounded-lg text-zinc-500 hover:text-white transition-colors">
               <Filter size={16} />
             </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-4">Destinatário</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Horário</th>
                <th className="px-6 py-4">ID da Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { name: 'Ricardo Santos', company: 'Nexus Holding', status: 'Enviado', time: '13:42:10', id: 'gm_1z2x3c4v5b6n' },
                { name: 'Ana Oliveira', company: 'Horizon Logistics', status: 'Processando', time: '13:42:08', id: '-' },
                { name: 'Carlos Mendes', company: 'Vanguard Sol.', status: 'Falha', time: '13:41:55', id: 'ERR_TIMEOUT' },
                { name: 'Beatriz Costa', company: 'Global Tech', status: 'Enviado', time: '13:41:30', id: 'gm_9a8s7d6f5g4h' },
              ].map((log, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-4">
                    <div>
                      <p className="text-sm font-medium">{log.name}</p>
                      <p className="text-[10px] text-zinc-500">{log.company}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-2 text-xs font-medium ${
                      log.status === 'Enviado' ? 'text-emerald-500' : 
                      log.status === 'Falha' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        log.status === 'Enviado' ? 'bg-emerald-500' : 
                        log.status === 'Falha' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'
                      }`} />
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                    {log.time}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                    {log.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
