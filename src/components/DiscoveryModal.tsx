import React, { useState } from 'react';
import { X, Search, MapPin, Building2, Star, Globe, Phone, Loader2, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function DiscoveryModal({ isOpen, onClose, onImportSuccess }: DiscoveryModalProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importingCid, setImportingCid] = useState<string | null>(null);
  const [importedCids, setImportedCids] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !location) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('discover-leads', {
        body: { query, location }
      });

      if (error) throw error;
      setResults(data.leads || []);
    } catch (error) {
      console.error('Erro na descoberta:', error);
      alert('Falha ao buscar leads. Verifique a configuração da SERPER_API_KEY.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (place: any) => {
    setImportingCid(place.cid);
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          name: place.name,
          nome_cliente: place.name,
          address_street: place.address_street,
          address_city: place.address_city,
          phone: place.phone,
          website: place.website,
          sector: place.category,
          source: 'Prospecção Externa',
          status: 'Novo'
        });

      if (error) throw error;
      
      setImportedCids(prev => [...prev, place.cid]);
      onImportSuccess();
    } catch (error) {
      console.error('Erro ao importar lead:', error);
      alert('Falha ao importar lead.');
    } finally {
      setImportingCid(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] glass rounded-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Search className="text-primary" size={20} />
              Prospecção Inteligente
            </h2>
            <p className="text-xs text-zinc-500">Busque novas empresas diretamente no Google Maps</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 bg-white/[0.01]">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="O que você busca? (Ex: Construtoras)" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Em qual cidade?" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading || !query || !location}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              Buscar
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 italic">
              <Loader2 className="animate-spin mb-4 text-primary" size={32} />
              Mapeando oportunidades...
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result) => (
                <div key={result.cid} className="glass p-4 rounded-2xl border-white/5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">{result.name}</h4>
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Star size={10} className="text-amber-500 fill-amber-500" />
                        {result.rating} ({result.reviews} reviews) • {result.category}
                      </p>
                    </div>
                    {importedCids.includes(result.cid) ? (
                      <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg">
                        <CheckCircle2 size={18} />
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleImport(result)}
                        disabled={importingCid === result.cid}
                        className="bg-white/5 hover:bg-primary hover:text-white p-2 rounded-lg transition-all text-zinc-400"
                        title="Importar para CRM"
                      >
                        {importingCid === result.cid ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400 flex items-center gap-2">
                      <MapPin size={12} className="text-zinc-600" />
                      {result.address_street}
                    </p>
                    <div className="flex gap-4">
                      {result.phone && (
                        <p className="text-[11px] text-zinc-400 flex items-center gap-2">
                          <Phone size={12} className="text-zinc-600" />
                          {result.phone}
                        </p>
                      )}
                      {result.website && (
                        <a 
                          href={result.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline flex items-center gap-2"
                        >
                          <Globe size={12} />
                          Site
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600 text-center">
              <Building2 className="mb-4 opacity-10" size={48} />
              <p className="text-sm italic">Digite o que busca e a localização para começar a prospecção.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
