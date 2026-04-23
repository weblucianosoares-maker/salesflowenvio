import { useState, useEffect } from 'react';
import { Bold, Italic, Link, Paperclip, Edit3, Tag, Zap, Eye, Users, Send, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Campanhas() {
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    const fetchLeadCount = async () => {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });
      setLeadCount(count || 0);
    };
    fetchLeadCount();
  }, []);

  return (
    <div className="p-8 text-white min-h-screen bg-background pt-20 premium-gradient">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Campanhas</h2>
          <p className="text-metal-silver font-medium opacity-60">Crie sequências de e-mail personalizadas com lógica de gotejamento.</p>
        </div>
        <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
          <Send size={18} />
          LANÇAR CAMPANHA
        </button>
      </div>
      
      <div className="grid grid-cols-12 gap-8">
        {/* Editor & Config */}
        <div className="col-span-8 space-y-6">
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Edit3 className="text-primary" size={20} />
                </div>
                <h3 className="font-bold text-lg">Composição do E-mail</h3>
              </div>
              <div className="flex gap-1">
                {[Bold, Italic, Link, Paperclip].map((Icon, i) => (
                  <button key={i} className="p-2.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">Assunto</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white focus:ring-1 focus:ring-primary outline-none font-medium" 
                  placeholder="Ex: Oportunidade de Parceria Estratégica para {{Partner}}" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">Mensagem</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-white h-80 focus:ring-1 focus:ring-primary outline-none leading-relaxed resize-none" 
                  placeholder="Escreva sua mensagem aqui... Use {{Name}}, {{Partner}}, etc. para personalizar."
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="glass p-6 rounded-3xl">
              <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Tag size={14} className="text-primary"/> 
                Variáveis Dinâmicas
              </h4>
              <div className="flex flex-wrap gap-2">
                {['Name', 'Partner', 'City', 'Sector'].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-primary/20 transition-colors">
                    {"{{" + tag + "}}"}
                  </span>
                ))}
              </div>
            </div>
            <div className="glass p-6 rounded-3xl border-blue-500/20 bg-blue-500/5">
              <h4 className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={14}/> 
                Configuração "Drip"
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 italic">Lotes de 50 e-mails</span>
                  <span className="text-zinc-500 italic">Intervalo: 15 min</span>
                </div>
                <button className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-blue-600/30 transition-all">
                  MODO SEGURO ATIVO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Reach */}
        <div className="col-span-4 space-y-6">
          <div className="glass p-8 rounded-3xl h-[400px] flex flex-col items-center justify-center text-center">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
               <Eye className="text-zinc-500 opacity-20" size={40}/>
             </div>
             <h4 className="font-bold text-zinc-500 mb-2">Live Preview</h4>
             <p className="text-xs text-zinc-600 px-8">Selecione um lead na tabela para visualizar a renderização final.</p>
          </div>
          
          <div className="glass p-8 rounded-3xl bg-emerald-500/[0.02] border-emerald-500/10">
            <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">Alcance Estimado</h4>
            <div className="flex items-end gap-2">
              <p className="text-5xl font-black text-white tracking-tighter">{leadCount.toLocaleString()}</p>
              <span className="text-sm font-medium text-emerald-500 mb-2 flex items-center gap-1">
                Leads <Users size={14} />
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <Clock size={12} />
              Tempo estimado: {Math.ceil((leadCount / 50) * 0.25)} horas
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border-amber-500/20 bg-amber-500/5">
            <div className="flex gap-4">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <div>
                <h5 className="text-sm font-bold text-amber-500 mb-1">Reputação do Domínio</h5>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Lembre-se de incluir o link de descadastro para manter sua conta saudável.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

