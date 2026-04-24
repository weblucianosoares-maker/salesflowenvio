import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, Clock, AlertCircle, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Monitorar() {
  const [emails, setEmails] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, sent: 0, error: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
    // Atualização em tempo real (opcional) ou a cada 10 segundos
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select(`
          id,
          recipient_email,
          subject,
          status,
          error_message,
          created_at,
          sent_at,
          campaign_id,
          campaigns (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (data) {
        setEmails(data);
        const pending = data.filter(e => e.status === 'pending').length;
        const sent = data.filter(e => e.status === 'sent').length;
        const errCount = data.filter(e => e.status === 'error').length;
        setStats({ pending, sent, error: errCount });
      }
    } catch (err) {
      console.error('Erro ao buscar dados do monitor:', err);
    }
  };

  const filteredEmails = emails.filter(e => 
    e.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.subject && e.subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const deliveryRate = stats.sent + stats.error > 0 
    ? ((stats.sent / (stats.sent + stats.error)) * 100).toFixed(1) 
    : '0.0';

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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Na Fila', value: stats.pending, icon: Clock, color: 'text-blue-400' },
          { label: 'Enviados (Recentes)', value: stats.sent, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Falhas', value: stats.error, icon: AlertCircle, color: 'text-red-400' },
          { label: 'Taxa de Entrega', value: `${deliveryRate}%`, icon: Activity, color: 'text-primary' },
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
               <input 
                 type="text" 
                 placeholder="Buscar e-mail..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="bg-white/5 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-primary w-64 text-white" 
               />
             </div>
          </div>
        </div>

        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-4">Destinatário</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Horário</th>
                <th className="px-6 py-4">Campanha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEmails.map((email, i) => (
                <tr key={email.id || i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-4">
                    <div>
                      <p className="text-sm font-medium">{email.recipient_email}</p>
                      <p className="text-[10px] text-zinc-500 max-w-[200px] truncate" title={email.subject}>{email.subject}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-2 text-xs font-medium ${
                      email.status === 'sent' ? 'text-emerald-500' : 
                      email.status === 'error' ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        email.status === 'sent' ? 'bg-emerald-500' : 
                        email.status === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                      }`} />
                      {email.status === 'sent' ? 'Enviado' : email.status === 'error' ? 'Erro' : 'Processando'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                    {new Date(email.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500">
                    {email.campaigns?.name || '---'}
                  </td>
                </tr>
              ))}
              {filteredEmails.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-8 text-center text-zinc-500 italic">Nenhuma atividade recente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
