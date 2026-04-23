import { useState, useEffect } from 'react';
import { Database, Zap, Mail, TrendingUp, ArrowUpRight, Target, Users, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    activeLeads: 0,
    emailsSent: 0,
    openRate: '0%'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      const { count: activeLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'Arquivado');

      // Placeholder metrics for now
      setMetrics({
        totalLeads: totalLeads || 0,
        activeLeads: activeLeads || 0,
        emailsSent: 0,
        openRate: '0%'
      });
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 text-white min-h-screen bg-background pt-20 premium-gradient">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight mb-2">Visão Executiva</h2>
          <p className="text-metal-silver font-medium opacity-60">Métricas de governança e aquisição de leads em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <button className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/5 transition-all">
            <Calendar size={16} />
            Últimos 30 dias
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
            Exportar Relatório
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Total de Leads', value: isLoading ? <Loader2 className="animate-spin" size={20} /> : metrics.totalLeads.toLocaleString(), icon: Database, color: 'text-blue-500', trend: '+12%' },
          { title: 'Leads Ativos', value: isLoading ? <Loader2 className="animate-spin" size={20} /> : metrics.activeLeads.toLocaleString(), icon: Zap, color: 'text-emerald-500', trend: '+5%' },
          { title: 'E-mails Enviados', value: metrics.emailsSent.toLocaleString(), icon: Mail, color: 'text-amber-500', trend: '+18%' },
          { title: 'Taxa de Abertura', value: metrics.openRate, icon: TrendingUp, color: 'text-blue-400', trend: '+2%' },
        ].map((kpi, i) => (
          <div key={i} className="glass p-6 rounded-2xl group hover:border-primary/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-white/5 group-hover:scale-110 transition-transform`}>
                <kpi.icon className={kpi.color} size={24} />
              </div>
              <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                {kpi.trend}
                <ArrowUpRight size={12} />
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{kpi.title}</p>
            <div className="text-3xl font-bold text-white tracking-tight h-10 flex items-center">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 glass rounded-2xl p-8 h-80 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Volume de Prospecção
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Meta
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                Realizado
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-end gap-2 px-4">
             {/* Simple visual bar chart placeholder */}
             {[40, 60, 45, 90, 65, 80, 55, 70, 95, 60, 75, 85].map((h, i) => (
               <div key={i} className="flex-1 bg-white/5 rounded-t-sm relative group">
                 <div 
                   className="absolute bottom-0 left-0 right-0 bg-primary/40 group-hover:bg-primary transition-all rounded-t-sm" 
                   style={{ height: `${h}%` }}
                 />
               </div>
             ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-8 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Target size={20} className="text-primary" />
            Meta Mensal
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="w-40 h-40 rounded-full border-4 border-white/5 flex items-center justify-center relative">
              <div className="text-center">
                <p className="text-4xl font-bold">78%</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Atingido</p>
              </div>
              {/* Semi-circle stroke simulation */}
              <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90">
                <circle 
                   cx="50%" cy="50%" r="48%" 
                   className="stroke-primary fill-none" 
                   strokeWidth="4" 
                   strokeDasharray="301" 
                   strokeDashoffset="66"
                   strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Leads Convertidos</span>
              <span className="font-bold">214 / 300</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '78%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

