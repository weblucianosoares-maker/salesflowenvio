import { useState, useEffect } from 'react';
import { Filter, Search, Plus, MoreHorizontal, MapPin, Building2, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('Todos os Estados');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchLeads();
  }, [searchTerm, filterState]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%,address_city.ilike.%${searchTerm}%`);
      }

      if (filterState !== 'Todos os Estados') {
        const uf = filterState.split(', ')[1];
        query = query.eq('address_state', uf);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeads(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 text-white min-h-screen bg-background pt-20 premium-gradient flex gap-8">
      {/* Sidebar Filters */}
      <aside className="w-80 space-y-6 shrink-0">
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Filter size={18} className="text-primary" />
              Segmentação
            </h3>
            <button 
              onClick={() => {
                setFilterState('Todos os Estados');
                setSearchTerm('');
              }}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Limpar
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Território</label>
              <select 
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none"
              >
                <option value="Todos os Estados">Todos os Estados</option>
                <option value="Rio de Janeiro, RJ">Rio de Janeiro, RJ</option>
                <option value="São Paulo, SP">São Paulo, SP</option>
                <option value="Minas Gerais, MG">Minas Gerais, MG</option>
                <option value="Espírito Santo, ES">Espírito Santo, ES</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Porte da Empresa</label>
              <div className="space-y-2">
                {['Pequena (PME)', 'Média', 'Grande Corp'].map((size) => (
                  <label key={size} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-4 h-4 rounded border border-white/10 group-hover:border-primary/50 transition-colors" />
                    <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">{size}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Faixa de Faturamento</label>
              <input type="range" className="w-full accent-primary bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer" />
              <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                <span>R$ 0</span>
                <span>R$ 50M+</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl bg-primary/5 border-primary/10">
          <h4 className="text-sm font-semibold mb-2">Dica de Prospecção</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Empresas do setor de tecnologia no RJ tiveram um aumento de 15% na busca por benefícios este mês.
          </p>
        </div>
      </aside>

      {/* Main Table */}
      <section className="flex-1 glass rounded-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por CNPJ, Razão Social ou Cidade..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button className="glass px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-all">
              Filtrar CNAE
            </button>
            <button className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
              <Plus size={18} />
              Novo Lead
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-zinc-500 italic">
              <Loader2 className="animate-spin mb-4 text-primary" size={32} />
              Carregando leads do Supabase...
            </div>
          ) : leads.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-white/5 bg-white/[0.01]">
                  <th className="px-8 py-5">Empresa</th>
                  <th className="px-6 py-5">Localização</th>
                  <th className="px-6 py-5">CNAE / Setor</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-white/[0.03] transition-colors cursor-pointer">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                          {lead.name?.[0] || 'L'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors">{lead.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono tracking-tighter">{lead.cnpj}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <MapPin size={14} className="text-zinc-600" />
                        {lead.address_city || 'N/A'}, {lead.address_state || '--'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-sm flex items-center gap-2">
                          <Building2 size={14} className="text-zinc-600" />
                          {lead.company_size || 'N/A'}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">{lead.cnae || 'Sem CNAE'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        lead.status === 'Novo' ? 'bg-blue-500/10 text-blue-500' : 
                        lead.status === 'Qualificado' ? 'bg-emerald-500/10 text-emerald-500' : 
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-600 hover:text-white">
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-zinc-500 italic">
              Nenhum lead encontrado para os filtros selecionados.
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Mostrando <span className="text-white font-bold">{leads.length}</span> de <span className="text-white font-bold">{totalCount.toLocaleString()}</span> leads
          </p>
          <div className="flex gap-2">
            <button className="glass px-3 py-1 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30" disabled>Anterior</button>
            <button className="glass px-3 py-1 rounded-lg text-xs hover:bg-white/10">Próxima</button>
          </div>
        </div>
      </section>
    </div>
  );
}

