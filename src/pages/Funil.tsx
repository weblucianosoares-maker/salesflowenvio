import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Search, Filter, Phone, Mail, Building2, MapPin } from 'lucide-react';

const FUNNEL_STAGES = [
  'No cadastro',
  'E-mail Enviado',
  'E-mail Respondido',
  'Ligação Realizada',
  'Reunião Agendada',
  'Proposta Enviada',
  'Contrato Implantado',
  'Follow-up Infinito'
];

export function Funil() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeadStage = async (leadId: string, newStage: string) => {
    // Atualização otimista
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_stage: newStage } : l));
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ pipeline_stage: newStage })
        .eq('id', leadId);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Erro ao atualizar estágio:', err);
      // Reverter em caso de erro
      fetchLeads();
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    // O setTimeout é necessário para o elemento não desaparecer imediatamente enquanto arrastado no Chrome
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.4';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedLeadId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedLeadId) {
      updateLeadStage(draggedLeadId, stage);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (lead.name && lead.name.toLowerCase().includes(term)) ||
      (lead.nome_cliente && lead.nome_cliente.toLowerCase().includes(term)) ||
      (lead.cnpj && lead.cnpj.includes(term))
    );
  });

  return (
    <div className="p-8 text-white h-screen bg-background pt-20 premium-gradient flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Funil de Vendas</h2>
          <p className="text-metal-silver font-medium opacity-60">Gerencie a jornada de prospecção e conversão dos seus leads.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar no funil..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all w-64"
            />
          </div>
          <button className="glass p-2 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
          <div className="flex gap-6 h-full min-w-max px-2">
            {FUNNEL_STAGES.map((stage) => {
              const columnLeads = filteredLeads.filter(l => (l.pipeline_stage || 'No cadastro') === stage);
              
              return (
                <div 
                  key={stage}
                  className="w-80 flex flex-col bg-[#121316] border border-white/5 rounded-3xl overflow-hidden shrink-0"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-300">{stage}</h3>
                    <span className="text-[10px] font-bold px-2 py-1 bg-white/5 rounded-md text-zinc-400">
                      {columnLeads.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className="bg-white/5 border border-white/10 p-4 rounded-2xl cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-white/10 transition-all shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-sm leading-tight mb-1">{lead.name || lead.nome_cliente}</p>
                            <p className="text-[10px] font-mono text-zinc-500">{lead.cnpj}</p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {(lead.name || lead.nome_cliente || 'L')[0]}
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Building2 size={12} className="text-zinc-500" />
                            <span className="truncate">{lead.cnae || 'Setor não informado'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <MapPin size={12} className="text-zinc-500" />
                            <span className="truncate">{lead.address_city || 'Cidade N/A'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex gap-2">
                            {lead.phone && (
                              <a href={`tel:${lead.phone.replace(/\\D/g, '')}`} onClick={e => e.stopPropagation()} title="Ligar">
                                <Phone size={14} className="text-zinc-400 hover:text-emerald-500 transition-colors" />
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} title="Enviar E-mail">
                                <Mail size={14} className="text-zinc-400 hover:text-primary transition-colors" />
                              </a>
                            )}
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md ${
                            lead.status === 'Qualificado' ? 'bg-emerald-500/10 text-emerald-500' : 
                            lead.status === 'Novo' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {lead.status || 'Novo'}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {columnLeads.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-zinc-600 text-xs italic">
                        Solte cards aqui
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
