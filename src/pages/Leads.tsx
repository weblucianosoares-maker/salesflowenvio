import { useState, useEffect } from 'react';
import { Filter, Search, Plus, MoreHorizontal, MapPin, Building2, Briefcase, Loader2, Download, Trash2, X, Phone, Mail, Globe, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('Todos os Estados');
  const [filterCity, setFilterCity] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setPage(0);
    fetchLeads();
  }, [searchTerm, filterState, filterCity, filterNeighborhood, selectedSizes]);

  useEffect(() => {
    fetchLeads();
  }, [page]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,nome_cliente.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%,address_city.ilike.%${searchTerm}%`);
      }

      if (filterState !== 'Todos os Estados') {
        const uf = filterState.includes(', ') ? filterState.split(', ')[1] : filterState;
        query = query.eq('address_state', uf);
      }

      if (filterCity) {
        query = query.ilike('address_city', `%${filterCity}%`);
      }

      if (filterNeighborhood) {
        query = query.ilike('address_neighborhood', `%${filterNeighborhood}%`);
      }

      if (selectedSizes.length > 0) {
        query = query.in('company_size', selectedSizes);
      }

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLeads(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setLeads(prev => prev.filter(l => l.id !== id));
      setTotalCount(prev => prev - 1);
      if (selectedLead?.id === id) setSelectedLead(null);
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      alert('Falha ao excluir lead.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;

    const headers = ['Nome', 'CNPJ', 'Status', 'Telefone', 'Email', 'Cidade', 'Estado', 'Porte'];
    const rows = leads.map(l => [
      l.name || l.nome_cliente || '',
      l.cnpj || '',
      l.status || '',
      l.phone || '',
      l.email || '',
      l.address_city || '',
      l.address_state || '',
      l.company_size || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const refreshLeadData = async (lead: any) => {
    if (!lead.cnpj) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${lead.cnpj.replace(/\D/g, '')}`);
      if (!response.ok) throw new Error('Falha ao consultar API de CNPJ');
      
      const data = await response.json();
      
      const updatedData = {
        name: data.razao_social || data.nome_fantasia,
        nome_cliente: data.razao_social || data.nome_fantasia,
        nome_fantasia: data.nome_fantasia,
        address_street: data.logradouro,
        address_number: data.numero,
        address_neighborhood: data.bairro,
        address_city: data.municipio,
        address_state: data.uf,
        address_zip: data.cep,
        phone: data.ddd_telefone_1 || data.ddd_telefone_2,
        email: data.email,
        cnae: `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}`,
        secondary_cnaes: data.cnaes_secundarios?.map((c: any) => `${c.codigo} - ${c.descricao}`).join(' | '),
        registration_status: data.descricao_situacao_cadastral,
        last_registration_update: data.data_situacao_cadastral,
        activity_start_date: data.data_inicio_atividade,
        legal_nature: data.natureza_juridica,
        capital_social: data.capital_social,
        tax_regime: data.opcao_pelo_simples ? (data.opcao_pelo_mei ? 'MEI' : 'Simples Nacional') : 'Lucro Presumido/Real',
        // Dados do 1º Sócio (QSA)
        partner_id: data.qsa?.[0]?.identificador_de_socio,
        partner_name: data.qsa?.[0]?.nome_socio,
        partner_age_range: data.qsa?.[0]?.faixa_etaria,
        partner_cpf_cnpj: data.qsa?.[0]?.cnpj_cpf_do_socio,
        partner_qualification: data.qsa?.[0]?.qualificacao_socio,
        partner_entry_date: data.qsa?.[0]?.data_entrada_sociedade
      };

      const { error } = await supabase
        .from('leads')
        .update(updatedData)
        .eq('id', lead.id);

      if (error) throw error;

      const finalLead = { ...lead, ...updatedData };
      setSelectedLead(finalLead);
      setLeads(prev => prev.map(l => l.id === lead.id ? finalLead : l));
      alert('Dados atualizados com sucesso via Receita Federal!');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      alert('Não foi possível atualizar os dados via CNPJ neste momento.');
    } finally {
      setIsUpdating(false);
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
                setFilterCity('');
                setFilterNeighborhood('');
                setSearchTerm('');
                setSelectedSizes([]);
                setPage(0);
              }}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Limpar
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Território</label>
              <div className="space-y-4">
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

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                  <input 
                    type="text" 
                    placeholder="Cidade..."
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                  <input 
                    type="text" 
                    placeholder="Bairro..."
                    value={filterNeighborhood}
                    onChange={(e) => setFilterNeighborhood(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Porte da Empresa</label>
              <div className="space-y-2">
                {['MEI', 'MICRO EMPRESA', 'EPP', 'DEMAIS', 'MÉDIO/GRANDE PORTE'].map((size) => (
                  <label key={size} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={selectedSizes.includes(size)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSizes(prev => [...prev, size]);
                        } else {
                          setSelectedSizes(prev => prev.filter(s => s !== size));
                        }
                      }}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded border ${selectedSizes.includes(size) ? 'bg-primary border-primary' : 'border-white/10'} group-hover:border-primary/50 transition-colors flex items-center justify-center`}>
                      {selectedSizes.includes(size) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-[11px] ${selectedSizes.includes(size) ? 'text-white font-medium' : 'text-zinc-400'} group-hover:text-white transition-colors`}>{size}</span>
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
            <button 
              onClick={handleExportCSV}
              disabled={leads.length === 0}
              className="glass px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-all disabled:opacity-30"
            >
              <Download size={18} />
              Exportar
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
                  <tr 
                    key={lead.id} 
                    onClick={() => {
                      setSelectedLead(lead);
                      setViewMode('detail');
                    }} 
                    className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                          {(lead.name || lead.nome_cliente || 'L')[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors">{lead.name || lead.nome_cliente || 'Sem Nome'}</p>
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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setViewMode('detail');
                          }}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                        >
                          <Search size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(lead.id);
                          }}
                          disabled={isDeleting === lead.id}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-500 disabled:opacity-30"
                        >
                          {isDeleting === lead.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
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
            <button 
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              disabled={page === 0}
              className="glass px-3 py-1 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              Anterior
            </button>
            <button 
              onClick={() => setPage(prev => prev + 1)}
              disabled={(page + 1) * ITEMS_PER_PAGE >= totalCount}
              className="glass px-3 py-1 rounded-lg text-xs hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      </section>

      {/* Lead Details Full Page View */}
      {selectedLead && viewMode === 'detail' && (
        <div className="fixed inset-0 z-[60] bg-background overflow-auto animate-in fade-in zoom-in duration-300">
          <div className="max-w-7xl mx-auto p-8 space-y-8">
            <header className="flex items-center justify-between">
              <button 
                onClick={() => setViewMode('list')}
                className="glass px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition-all"
              >
                <X size={18} />
                Fechar Ficha
              </button>
              <div className="flex gap-4">
                <button 
                  onClick={() => refreshLeadData(selectedLead)}
                  disabled={isUpdating}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                  Atualizar Dados via Receita
                </button>
                <button 
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="bg-red-500/10 text-red-500 px-6 py-2.5 rounded-xl font-bold hover:bg-red-500/20 transition-all"
                >
                  Excluir Lead
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass p-8 rounded-3xl flex flex-col items-center text-center">
                  <div className="w-32 h-32 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary text-5xl font-bold mb-6 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                    {(selectedLead.name || selectedLead.nome_cliente || 'L')[0]}
                  </div>
                  <h1 className="text-2xl font-bold mb-2 leading-tight">{selectedLead.name || selectedLead.nome_cliente}</h1>
                  <p className="text-zinc-500 font-mono text-sm mb-6">{selectedLead.cnpj}</p>
                  
                  <div className="w-full grid grid-cols-2 gap-4 text-left">
                    <div className="bg-white/[0.03] p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Status</p>
                      <span className="text-xs font-bold text-primary">{selectedLead.status}</span>
                    </div>
                    <div className="bg-white/[0.03] p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Porte</p>
                      <span className="text-xs font-bold text-white">{selectedLead.company_size || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Phone size={16} className="text-primary" />
                    Canais de Contato
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">WhatsApp / Telefone</p>
                      <p className="text-sm font-medium flex items-center justify-between">
                        {selectedLead.phone || 'Não informado'}
                        {selectedLead.phone && <button className="text-primary text-xs font-bold">Ligar</button>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">E-mail Corporativo</p>
                      <p className="text-sm font-medium flex items-center justify-between">
                        {selectedLead.email || 'Não informado'}
                        {selectedLead.email && <button className="text-primary text-xs font-bold">Enviar</button>}
                      </p>
                    </div>
                    {selectedLead.website && (
                      <div>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Website</p>
                        <p className="text-sm font-medium flex items-center justify-between">
                          {selectedLead.website}
                          <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noreferrer" className="text-primary text-xs font-bold">Visitar</a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Info */}
              <div className="lg:col-span-2 space-y-8">
                <div className="glass p-8 rounded-3xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <Building2 className="text-primary" />
                    Ficha Técnica da Empresa
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Razão Social</p>
                      <p className="text-sm font-medium text-white">{selectedLead.name || selectedLead.nome_cliente}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nome Fantasia</p>
                      <p className="text-sm font-medium text-zinc-400">{selectedLead.nome_fantasia || 'Igual à Razão Social'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CNAE Principal</p>
                      <p className="text-sm font-medium text-white">{selectedLead.cnae || 'N/A'}</p>
                    </div>
                    <div className="col-span-full space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CNAEs Secundários</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{selectedLead.secondary_cnaes || 'Nenhum informado'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Início da Atividade</p>
                      <p className="text-sm font-medium text-white">{selectedLead.activity_start_date || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Capital Social</p>
                      <p className="text-sm font-medium text-emerald-500">
                        {selectedLead.capital_social ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.capital_social) : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Natureza Jurídica</p>
                      <p className="text-sm font-medium text-zinc-400">{selectedLead.legal_nature || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Regime Tributário</p>
                      <p className="text-sm font-bold text-primary">{selectedLead.tax_regime || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <Briefcase className="text-primary" />
                    Quadro de Sócios (QSA)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nome do 1º Sócio</p>
                      <p className="text-sm font-medium text-white">{selectedLead.partner_name || 'Não informado'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CPF/CNPJ do Sócio</p>
                      <p className="text-sm font-medium text-zinc-400">{selectedLead.partner_cpf_cnpj || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Faixa Etária</p>
                      <p className="text-sm font-medium text-white">{selectedLead.partner_age_range || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Qualificação</p>
                      <p className="text-sm font-medium text-white">{selectedLead.partner_qualification || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Data de Entrada</p>
                      <p className="text-sm font-medium text-white">{selectedLead.partner_entry_date || '---'}</p>
                    </div>
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3 text-red-500">
                    <Filter className="text-red-500" />
                    Dívidas e Pendências Federais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dívidas Federais Ativas</p>
                      <p className={`text-sm font-bold ${selectedLead.active_federal_debts ? 'text-red-500' : 'text-emerald-500'}`}>
                        {selectedLead.active_federal_debts || 'Nenhuma informada'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total de Dívidas</p>
                      <p className="text-lg font-black text-red-500">
                        {selectedLead.total_debts ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.total_debts) : 'R$ 0,00'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <MapPin className="text-primary" />
                    Localização e Sede
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Logradouro</p>
                        <p className="text-white">{selectedLead.address_street}, {selectedLead.address_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Bairro</p>
                        <p className="text-white">{selectedLead.address_neighborhood}</p>
                      </div>
                    </div>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Cidade / UF</p>
                        <p className="text-white">{selectedLead.address_city} - {selectedLead.address_state}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">CEP</p>
                        <p className="text-white">{selectedLead.address_zip}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold hover:brightness-110 transition-all text-lg shadow-xl shadow-primary/20">
                    Iniciar Abordagem Comercial
                  </button>
                  <button className="glass px-8 py-4 rounded-2xl font-bold hover:bg-white/5 transition-all">
                    Agendar Reunião
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

