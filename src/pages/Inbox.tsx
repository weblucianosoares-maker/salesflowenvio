import { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle2, Clock, AlertCircle, Trash2, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Inbox() {
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ pending: 0, sent: 0, error: 0 });

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      // Buscar os emails mais recentes
      const { data, error } = await supabase
        .from('email_queue')
        .select(`
          id,
          recipient_email,
          subject,
          body_html,
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
        
        // Calcular estatísticas (baseado nos retornados ou em nova query)
        const pending = data.filter(e => e.status === 'pending').length;
        const sent = data.filter(e => e.status === 'sent').length;
        const errCount = data.filter(e => e.status === 'error').length;
        setStats({ pending, sent, error: errCount });
      }
    } catch (err) {
      console.error('Erro ao buscar e-mails:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const processQueue = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/process-queue', { method: 'POST' });
      const result = await response.json();
      alert(`Fila processada! Enviados: ${result.processed}, Erros: ${result.errors || 0}`);
      fetchEmails();
    } catch (err) {
      console.error('Erro ao chamar api/process-queue:', err);
      alert('Erro ao tentar processar a fila. O motor Vercel Serverless pode estar com problema de configuração.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteEmail = async (id: string) => {
    const { error } = await supabase.from('email_queue').delete().eq('id', id);
    if (!error) {
      fetchEmails();
    }
  };

  return (
    <div className="p-8 text-white min-h-screen bg-background pt-20 premium-gradient">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Caixa de E-mails</h2>
          <p className="text-metal-silver font-medium opacity-60">Histórico de disparos, pendências e erros das suas campanhas.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchEmails}
            className="glass border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            ATUALIZAR
          </button>
          <button 
            onClick={processQueue}
            disabled={isProcessing}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            {isProcessing ? 'ENVIANDO...' : 'PROCESSAR FILA AGORA'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <Clock className="text-amber-500" size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Na Fila (Aguardando)</p>
            <p className="text-2xl font-black text-white">{stats.pending}</p>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <CheckCircle2 className="text-emerald-500" size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Enviados com Sucesso</p>
            <p className="text-2xl font-black text-emerald-500">{stats.sent}</p>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Falhas / Erros</p>
            <p className="text-2xl font-black text-red-500">{stats.error}</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center gap-3">
          <Mail size={18} className="text-primary" />
          <h3 className="font-semibold text-sm">Histórico Recente</h3>
        </div>
        
        {isLoading ? (
          <div className="p-12 flex justify-center"><RefreshCw className="animate-spin text-zinc-500" size={32} /></div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">Nenhum e-mail na fila ou enviado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/[0.01] border-b border-white/5">
                  <th className="px-8 py-4">Destinatário</th>
                  <th className="px-6 py-4">Assunto</th>
                  <th className="px-6 py-4">Campanha</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-4 text-sm font-medium text-white">{email.recipient_email}</td>
                    <td className="px-6 py-4 text-sm text-zinc-300 max-w-[200px] truncate" title={email.subject}>
                      {email.subject}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {email.campaigns?.name || 'Desconhecida'}
                    </td>
                    <td className="px-6 py-4">
                      {email.status === 'sent' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-[10px] font-bold uppercase">Enviado</span>}
                      {email.status === 'pending' && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-md text-[10px] font-bold uppercase">Na Fila</span>}
                      {email.status === 'error' && (
                        <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-md text-[10px] font-bold uppercase cursor-help" title={email.error_message}>
                          Erro
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {new Date(email.created_at).toLocaleString()}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button onClick={() => deleteEmail(email.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
