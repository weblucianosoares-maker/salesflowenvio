import { useState, useEffect } from 'react';
import { Filter, Search, Plus, MoreHorizontal, MapPin, Building2, Briefcase, Loader2, Download, Trash2, X, Phone, Mail, Globe, Database, MessageSquare, Send, Clock, History, Sparkles, Linkedin, Instagram, Facebook } from 'lucide-react';
import { supabase } from '../lib/supabase';

const getMarketFromCNAE = (cnae: string) => {
  if (!cnae) return 'Não identificado';
  const code = cnae.replace(/\D/g, '').substring(0, 2);
  const div = parseInt(code);

  if (div >= 1 && div <= 3) return 'Agronegócio';
  if (div >= 5 && div <= 9) return 'Mineração';
  if (div >= 10 && div <= 33) return 'Indústria';
  if (div >= 35 && div <= 39) return 'Utilidades e Infraestrutura';
  if (div >= 41 && div <= 43) return 'Construção Civil';
  if (div >= 45 && div <= 47) return 'Comércio e Varejo';
  if (div >= 49 && div <= 53) return 'Transporte e Logística';
  if (div >= 55 && div <= 56) return 'Turismo e Gastronomia';
  if (div >= 58 && div <= 63) return 'Tecnologia e Comunicação';
  if (div >= 64 && div <= 66) return 'Financeiro e Seguros';
  if (div >= 68) {
    if (div === 68) return 'Imobiliário';
    if (div >= 69 && div <= 75) return 'Serviços Profissionais';
    if (div >= 77 && div <= 82) return 'Serviços Administrativos';
    if (div === 84) return 'Setor Público';
    if (div === 85) return 'Educação';
    if (div >= 86 && div <= 88) return 'Saúde';
    if (div >= 90 && div <= 93) return 'Lazer e Cultura';
    if (div >= 94 && div <= 96) return 'Serviços Pessoais';
  }
  return 'Serviços Gerais';
};

const sanitizeText = (text: string | null) => {
  if (!text) return '';
  // Remove o caractere de substituição Unicode e outros artefatos de encoding comuns
  // Incluindo o losango com interrogação e caracteres de controle
  return text.replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
};

export function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('Todos os Estados');
  const [filterCity, setFilterCity] = useState('Todas as Cidades');
  const [filterNeighborhood, setFilterNeighborhood] = useState('Todos os Bairros');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [revenueRange, setRevenueRange] = useState(50000000);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const [filterOptions, setFilterOptions] = useState({
    states: [] as string[],
    cities: [] as string[],
    neighborhoods: [] as string[],
    sectors: [] as string[]
  });

  const ITEMS_PER_PAGE = 10;

  const calculateAge = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return '';
    try {
      const birthDate = new Date(dateStr);
      if (isNaN(birthDate.getTime())) return '';
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months = months < 0 ? months + 12 : months;
      }
      return `(${years} anos e ${months} meses)`;
    } catch {
      return '';
    }
  };

  const formatDateBR = (dateStr: string | number | null) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    
    // Se for um número (formato serial do Excel)
    if (typeof dateStr === 'number' || (!isNaN(Number(dateStr)) && !String(dateStr).includes('-') && !String(dateStr).includes('/'))) {
      const serial = Number(dateStr);
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toLocaleDateString('pt-BR');
    }

    const str = String(dateStr);
    if (str.includes('/')) return str;
    try {
      const [year, month, day] = str.split('-');
      if (!year || !month || !day) return str;
      return `${day}/${month}/${year}`;
    } catch {
      return str;
    }
  };

  useEffect(() => {
    setPage(0);
    fetchLeads();
  }, [searchTerm, filterState, filterCity, filterNeighborhood, selectedSizes, selectedSectors, revenueRange]);

  useEffect(() => {
    fetchLeads();
  }, [page]);

  // Auto-refresh data from Receita when opening detail view
  useEffect(() => {
    if (selectedLead && viewMode === 'detail' && selectedLead.cnpj) {
      // Pequeno delay para não sobrepor a animação de abertura
      const timer = setTimeout(() => {
        refreshLeadData(selectedLead);
        fetchActivities(selectedLead.id);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedLead?.id, viewMode]);

  useEffect(() => {
    fetchInitialFilterOptions();
  }, []);

  useEffect(() => {
    if (filterState !== 'Todos os Estados') {
      fetchCities(filterState);
    } else {
      setFilterOptions(prev => ({ ...prev, cities: [], neighborhoods: [] }));
      setFilterCity('Todas as Cidades');
      setFilterNeighborhood('Todos os Bairros');
    }
  }, [filterState]);

  useEffect(() => {
    if (filterCity !== 'Todas as Cidades') {
      fetchNeighborhoods(filterCity);
    } else {
      setFilterOptions(prev => ({ ...prev, neighborhoods: [] }));
      setFilterNeighborhood('Todos os Bairros');
    }
  }, [filterCity]);

  const fetchInitialFilterOptions = async () => {
    try {
      const { data: stateData } = await supabase.rpc('get_distinct_values', { col_name: 'address_state' });
      const { data: sectorData } = await supabase.rpc('get_distinct_values', { col_name: 'sector' });
      
      // Se o RPC não existir, usamos uma query normal (menos eficiente mas funciona)
      if (!stateData) {
        const { data: sData } = await supabase.from('leads').select('address_state').not('address_state', 'is', null).order('address_state');
        const uniqueStates = Array.from(new Set(sData?.map(i => i.address_state))).filter(Boolean) as string[];
        
        const { data: secData } = await supabase.from('leads').select('sector').not('sector', 'is', null).order('sector');
        const uniqueSectors = Array.from(new Set(secData?.map(i => i.sector))).filter(Boolean) as string[];

        setFilterOptions(prev => ({ ...prev, states: uniqueStates, sectors: uniqueSectors }));
      } else {
        setFilterOptions(prev => ({ 
          ...prev, 
          states: stateData.map((i: any) => i.value),
          sectors: sectorData.map((i: any) => i.value)
        }));
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchCities = async (state: string) => {
    try {
      const { data } = await supabase
        .from('leads')
        .select('address_city')
        .eq('address_state', state)
        .not('address_city', 'is', null)
        .order('address_city');
      
      const uniqueCities = Array.from(new Set(data?.map(i => i.address_city))).filter(Boolean) as string[];
      setFilterOptions(prev => ({ ...prev, cities: uniqueCities }));
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchNeighborhoods = async (city: string) => {
    try {
      const { data } = await supabase
        .from('leads')
        .select('address_neighborhood')
        .eq('address_city', city)
        .not('address_neighborhood', 'is', null)
        .order('address_neighborhood');
      
      const uniqueNeighborhoods = Array.from(new Set(data?.map(i => i.address_neighborhood))).filter(Boolean) as string[];
      setFilterOptions(prev => ({ ...prev, neighborhoods: uniqueNeighborhoods }));
    } catch (error) {
      console.error('Error fetching neighborhoods:', error);
    }
  };

  const fetchActivities = async (leadId: string) => {
    setIsLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return;

    setIsSavingNote(true);
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: selectedLead.id,
          activity_type: 'note',
          content: newNote.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setActivities(prev => [data, ...prev]);
      setNewNote('');
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      alert('Falha ao salvar nota.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAIEnrichment = async () => {
    if (!selectedLead) return;
    
    setIsEnriching(true);
    try {
      // Chamada para a Edge Function de enriquecimento
      const { data, error } = await supabase.functions.invoke('enrich-lead', {
        body: { leadId: selectedLead.id }
      });

      if (error) throw error;

      if (data?.success) {
        const updatedLead = { ...selectedLead, ...data.lead };
        setSelectedLead(updatedLead);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
        alert('Enriquecimento concluído com sucesso!');
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro no enriquecimento:', error);
      alert('Não foi possível enriquecer este lead no momento. Certifique-se de que a função está configurada.');
    } finally {
      setIsEnriching(false);
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        const cleanTerm = searchTerm.replace(/\D/g, '');
        if (cleanTerm && /^\d+$/.test(cleanTerm)) {
          // Se for numérico, busca pelo CNPJ limpo OU pelo termo original nos outros campos
          query = query.or(`cnpj.ilike.%${cleanTerm}%,name.ilike.%${searchTerm}%,nome_cliente.ilike.%${searchTerm}%,address_city.ilike.%${searchTerm}%`);
        } else {
          query = query.or(`cnpj.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,nome_cliente.ilike.%${searchTerm}%,address_city.ilike.%${searchTerm}%`);
        }
      }

      if (filterState !== 'Todos os Estados') {
        const uf = filterState.includes(', ') ? filterState.split(', ')[1] : filterState;
        query = query.eq('address_state', uf);
      }

      if (filterCity !== 'Todas as Cidades') {
        query = query.eq('address_city', filterCity);
      }

      if (filterNeighborhood !== 'Todos os Bairros') {
        query = query.eq('address_neighborhood', filterNeighborhood);
      }

      if (selectedSizes.length > 0) {
        query = query.in('company_size', selectedSizes);
      }

      if (selectedSectors.length > 0) {
        query = query.in('sector', selectedSectors);
      }

      if (revenueRange < 50000000) {
        query = query.lte('capital_social', revenueRange);
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

    const headers = ['Nome', 'CNPJ', 'Status', 'Telefone 1', 'Telefone 2', 'Email', 'Cidade', 'Estado', 'Porte'];
    const rows = leads.map(l => [
      l.name || l.nome_cliente || '',
      l.cnpj || '',
      l.status || '',
      l.phone || '',
      l.phone_2 || '',
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
      
      // Proteção: Só atualiza se o dado da API não for nulo/vazio, ou se o dado local for vazio
      const finalUpdate: any = {};
      
      const mergeField = (field: string, newValue: any) => {
        const oldValue = selectedLead[field];
        if (newValue && newValue !== 'N/A' && newValue !== 0) {
          finalUpdate[field] = newValue;
        } else if (!oldValue) {
          finalUpdate[field] = newValue;
        }
      };

      mergeField('name', data.razao_social || data.nome_fantasia);
      mergeField('nome_cliente', data.razao_social || data.nome_fantasia);
      mergeField('nome_fantasia', data.nome_fantasia);
      mergeField('address_street', data.logradouro);
      mergeField('address_number', data.numero);
      mergeField('address_neighborhood', data.bairro);
      mergeField('address_city', data.municipio);
      mergeField('address_state', data.uf);
      mergeField('address_zip', data.cep);
      
      const apiPhone = data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0,2)}) ${data.ddd_telefone_1.substring(2)}` : '';
      const apiPhone2 = data.ddd_telefone_2 ? `(${data.ddd_telefone_2.substring(0,2)}) ${data.ddd_telefone_2.substring(2)}` : '';
      
      mergeField('phone', apiPhone);
      mergeField('phone_2', apiPhone2);
      mergeField('email', data.email);
      mergeField('cnae', data.cnae_fiscal);
      mergeField('cnae_description', data.cnae_fiscal_descricao);
      mergeField('sector', getMarketFromCNAE(data.cnae_fiscal));
      mergeField('secondary_cnaes', data.cnaes_secundarios?.map((c: any) => `${c.codigo} - ${c.descricao}`).join(' | '));
      mergeField('registration_status', data.descricao_situacao_cadastral);
      mergeField('company_size', data.porte === 1 ? 'MEI' : data.porte === 3 ? 'MICRO EMPRESA' : data.porte === 5 ? 'DEMAIS (MÉDIO/GRANDE)' : 'N/A');
      mergeField('last_registration_update', data.data_situacao_cadastral);
      mergeField('activity_start_date', data.data_inicio_atividade);
      mergeField('legal_nature', data.natureza_juridica);
      mergeField('capital_social', data.capital_social);
      mergeField('tax_regime', data.opcao_pelo_simples ? (data.opcao_pelo_mei ? 'MEI' : 'Simples Nacional') : 'Lucro Presumido/Real');
      
      // Dados do 1º Sócio (QSA)
      mergeField('partner_id', data.qsa?.[0]?.identificador_de_socio);
      mergeField('partner_name', data.qsa?.[0]?.nome_socio);
      mergeField('partner_age_range', data.qsa?.[0]?.faixa_etaria);
      mergeField('partner_cpf_cnpj', data.qsa?.[0]?.cnpj_cpf_do_socio);
      mergeField('partner_qualification', data.qsa?.[0]?.qualificacao_socio);
      mergeField('partner_entry_date', data.qsa?.[0]?.data_entrada_sociedade);

      if (Object.keys(finalUpdate).length === 0) return;

      const { error } = await supabase
        .from('leads')
        .update(finalUpdate)
        .eq('id', lead.id);

      if (error) throw error;

      const finalLead = { ...lead, ...finalUpdate };
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
                setFilterCity('Todas as Cidades');
                setFilterNeighborhood('Todos os Bairros');
                setSearchTerm('');
                setSelectedSizes([]);
                setSelectedSectors([]);
                setRevenueRange(50000000);
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
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                >
                  <option value="Todos os Estados" className="bg-[#1a1a1c] text-white">Todos os Estados</option>
                  {filterOptions.states.map(state => (
                    <option key={state} value={state} className="bg-[#1a1a1c] text-white">{state}</option>
                  ))}
                </select>

                <select 
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  disabled={filterState === 'Todos os Estados'}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer disabled:opacity-30"
                >
                  <option value="Todas as Cidades" className="bg-[#1a1a1c] text-white">Todas as Cidades</option>
                  {filterOptions.cities.map(city => (
                    <option key={city} value={city} className="bg-[#1a1a1c] text-white">{city}</option>
                  ))}
                </select>

                <select 
                  value={filterNeighborhood}
                  onChange={(e) => setFilterNeighborhood(e.target.value)}
                  disabled={filterCity === 'Todas as Cidades'}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer disabled:opacity-30"
                >
                  <option value="Todos os Bairros" className="bg-[#1a1a1c] text-white">Todos os Bairros</option>
                  {filterOptions.neighborhoods.map(neighborhood => (
                    <option key={neighborhood} value={neighborhood} className="bg-[#1a1a1c] text-white">{neighborhood}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Mercado de Atuação</label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {filterOptions.sectors.map((sector) => (
                  <label key={sector} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={selectedSectors.includes(sector)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSectors(prev => [...prev, sector]);
                        } else {
                          setSelectedSectors(prev => prev.filter(s => s !== sector));
                        }
                      }}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded border ${selectedSectors.includes(sector) ? 'bg-primary border-primary' : 'border-white/10'} group-hover:border-primary/50 transition-colors flex items-center justify-center`}>
                      {selectedSectors.includes(sector) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-[11px] ${selectedSectors.includes(sector) ? 'text-white font-medium' : 'text-zinc-400'} group-hover:text-white transition-colors`}>{sector}</span>
                  </label>
                ))}
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
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Faixa de Capital Social</label>
              <input 
                type="range" 
                min="0"
                max="50000000"
                step="100000"
                value={revenueRange}
                onChange={(e) => setRevenueRange(parseInt(e.target.value))}
                className="w-full accent-primary bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer" 
              />
              <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                <span>R$ 0</span>
                <span>{revenueRange >= 50000000 ? 'R$ 50M+' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(revenueRange)}</span>
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
                  onClick={handleAIEnrichment}
                  disabled={isEnriching}
                  className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isEnriching ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  Enriquecer com IA
                </button>
                <button 
                  onClick={() => refreshLeadData(selectedLead)}
                  disabled={isUpdating}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                  Atualizar via Receita
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
                    <div className="bg-white/[0.03] p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2">Telefones de Contato</p>
                      {[selectedLead.phone, selectedLead.phone_2].filter(Boolean).map((p, idx) => {
                        const cleanPhone = p.replace(/\D/g, '');
                        const isMobile = cleanPhone.length === 11 && cleanPhone[2] === '9';
                        return (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-2">
                              {isMobile ? (
                                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.853.448-1.271.607-1.444.159-.173.346-.217.462-.217l.332.006c.118.005.243-.009.344.246.127.322.427 1.045.466 1.129.04.083.067.18.012.298-.054.117-.082.19-.163.284-.081.095-.164.19-.235.25-.088.075-.18.156-.076.331.103.175.459.758.985 1.229.676.605 1.243.792 1.417.878.173.088.274.072.376-.045.101-.116.44-.512.557-.686.117-.174.232-.146.39-.086.157.058 1.002.474 1.175.56.173.088.289.131.332.203.043.072.043.419-.101.824z"/></svg>
                                </div>
                              ) : (
                                <Phone size={14} className="text-primary" />
                              )}
                              <span className="text-sm font-medium">{p}</span>
                            </div>
                            <div className="flex gap-3">
                              {isMobile && (
                                <a 
                                  href={`https://wa.me/55${cleanPhone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-bold text-emerald-500 hover:underline"
                                >
                                  WhatsApp
                                </a>
                              )}
                              <a href={`tel:${cleanPhone}`} className="text-[10px] font-bold text-primary hover:underline">Ligar</a>
                            </div>
                          </div>
                        );
                      })}
                      {![selectedLead.phone, selectedLead.phone_2].filter(Boolean).length && (
                        <p className="text-sm text-zinc-500 italic">Nenhum telefone informado</p>
                      )}
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
                    {(selectedLead.instagram || selectedLead.linkedin || selectedLead.facebook) && (
                      <div className="pt-4 border-t border-white/5 space-y-4">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase">Redes Sociais da Empresa</p>
                        <div className="flex gap-3">
                          {selectedLead.instagram && (
                            <a href={selectedLead.instagram} target="_blank" rel="noreferrer" className="p-2 bg-pink-500/10 text-pink-500 rounded-lg hover:bg-pink-500/20 transition-all">
                              <Instagram size={18} />
                            </a>
                          )}
                          {selectedLead.linkedin && (
                            <a href={selectedLead.linkedin} target="_blank" rel="noreferrer" className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-all">
                              <Linkedin size={18} />
                            </a>
                          )}
                          {selectedLead.facebook && (
                            <a href={selectedLead.facebook} target="_blank" rel="noreferrer" className="p-2 bg-blue-600/10 text-blue-600 rounded-lg hover:bg-blue-600/20 transition-all">
                              <Facebook size={18} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedLead.ai_summary && (
                  <div className="glass p-8 rounded-3xl bg-emerald-500/5 border-emerald-500/10">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2 mb-4">
                      <Sparkles size={16} />
                      Resumo Estratégico da IA
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed italic">
                      "{selectedLead.ai_summary}"
                         {/* Histórico e Anotações movido para cá */}
                <div className="glass p-8 rounded-3xl flex flex-col h-full min-h-[500px]">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-6">
                    <History size={16} className="text-primary" />
                    Histórico de Relacionamento
                  </h3>

                  {/* Add Note Form */}
                  <div className="mb-8 space-y-3">
                    <div className="relative">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Adicione uma nota sobre este lead..."
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary/50 transition-all resize-none min-h-[100px]"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={isSavingNote || !newNote.trim()}
                        className="absolute right-3 bottom-3 bg-primary text-white p-2 rounded-xl hover:brightness-110 transition-all disabled:opacity-30 shadow-lg shadow-primary/20"
                      >
                        {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Timeline List */}
                  <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar max-h-[400px]">
                    {isLoadingActivities ? (
                      <div className="flex flex-col items-center justify-center py-10 text-zinc-500 italic text-sm">
                        <Loader2 className="animate-spin mb-2" size={20} />
                        Carregando histórico...
                      </div>
                    ) : activities.length > 0 ? (
                      <div className="relative space-y-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                        {activities.map((activity) => (
                          <div key={activity.id} className="relative pl-12">
                            <div className={`absolute left-0 top-1 w-8 h-8 rounded-lg flex items-center justify-center z-10 ${
                              activity.activity_type === 'email' ? 'bg-blue-500/20 text-blue-500' :
                              activity.activity_type === 'note' ? 'bg-amber-500/20 text-amber-500' :
                              'bg-zinc-800 text-zinc-400'
                            }`}>
                              {activity.activity_type === 'email' ? <Mail size={14} /> :
                               activity.activity_type === 'note' ? <MessageSquare size={14} /> :
                               <Clock size={14} />}
                            </div>
                            <div className="glass-card p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  {activity.activity_type === 'email' ? 'E-mail Enviado' :
                                   activity.activity_type === 'note' ? 'Anotação' : 'Atividade'}
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                  {new Date(activity.created_at).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-300 leading-relaxed">{activity.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-zinc-600 italic text-sm opacity-20">
                        <History size={32} className="mx-auto mb-2" />
                        <p>Nenhuma interação registrada.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>                  </div>
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
                      <p className="text-sm font-medium text-white">{sanitizeText(selectedLead.name || selectedLead.nome_cliente)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Setor de Atuação</p>
                      <p className="text-sm font-bold text-primary">{selectedLead.sector || getMarketFromCNAE(selectedLead.cnae)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nome Fantasia</p>
                      <p className="text-sm font-medium text-zinc-400">{selectedLead.nome_fantasia || 'Igual à Razão Social'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CNAE Principal</p>
                      <p className="text-sm font-medium text-white">{sanitizeText(selectedLead.cnae) || 'N/A'}</p>
                    </div>
                    <div className="col-span-full space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descrição do CNAE</p>
                      <p className="text-sm font-medium text-zinc-300 leading-relaxed">{sanitizeText(selectedLead.cnae_description) || 'N/A'}</p>
                    </div>
                    <div className="col-span-full space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CNAEs Secundários</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{sanitizeText(selectedLead.secondary_cnaes) || 'Nenhum informado'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Início da Atividade</p>
                      <p className="text-sm font-medium text-white">
                        {formatDateBR(selectedLead.activity_start_date)}{' '}
                        <span className="text-[10px] text-zinc-500 font-normal">{calculateAge(selectedLead.activity_start_date)}</span>
                      </p>
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
                      <p className="text-sm font-bold text-blue-400">{sanitizeText(selectedLead.tax_regime) || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Faturamento Estimado</p>
                      <p className="text-sm font-medium text-white">{selectedLead.estimated_revenue || 'Não informado'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Quadro de Funcionários</p>
                      <p className="text-sm font-medium text-white">{selectedLead.employee_count || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl overflow-hidden">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <Briefcase className="text-primary" />
                    Quadro de Sócios (QSA)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                          <th className="pb-4 pr-4">Nome do Sócio</th>
                          <th className="pb-4 pr-4">Faixa Etária</th>
                          <th className="pb-4 pr-4">Qualificação</th>
                          <th className="pb-4 pr-4">Entrada</th>
                          <th className="pb-4 text-right">LinkedIn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(() => {
                          const names = (selectedLead.partner_name || '').split(';').filter(Boolean);
                          const ages = (selectedLead.partner_age_range || '').split(';');
                          const quals = (selectedLead.partner_qualification || '').split(';');
                          const dates = (selectedLead.partner_entry_date || '').split(';');
                          
                          if (names.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-zinc-500 italic text-sm">
                                  Nenhum sócio informado
                                </td>
                              </tr>
                            );
                          }

                          return names.map((name: string, idx: number) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="py-4 pr-4 text-sm font-medium text-white group-hover:text-primary transition-colors">
                                {sanitizeText(name)}
                              </td>
                              <td className="py-4 pr-4 text-xs text-zinc-400">
                                {sanitizeText(ages[idx]) || '---'}
                              </td>
                              <td className="py-4 pr-4 text-xs text-zinc-400">
                                {sanitizeText(quals[idx]) || '---'}
                              </td>
                              <td className="py-4 pr-4 text-xs text-zinc-400">
                                {formatDateBR(dates[idx]) || '---'}
                              </td>
                              <td className="py-4 text-right">
                                {idx === 0 && selectedLead.partner_linkedin ? (
                                  <a href={selectedLead.partner_linkedin} target="_blank" rel="noreferrer" className="inline-flex p-1.5 bg-blue-500/10 text-blue-500 rounded-md hover:bg-blue-500/20 transition-all">
                                    <Linkedin size={14} />
                                  </a>
                                ) : (
                                  <span className="text-zinc-700">---</span>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <Globe className="text-primary" />
                    Situação e Presença
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Situação do CNPJ</p>
                      <p className="text-sm font-bold text-white">{selectedLead.registration_status || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Última Atualização</p>
                      <p className="text-sm font-medium text-zinc-400">{formatDateBR(selectedLead.last_registration_update)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Quantidade de Filiais</p>
                      <p className="text-sm font-medium text-white">{selectedLead.branch_count || 'Não informado'}</p>
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

