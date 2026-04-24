import { useState, useRef } from 'react';
import { CloudUpload, FileText, Search, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export function ImportCenter() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importHistory, setImportHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('salesflow_import_history');
    return saved ? JSON.parse(saved) : [];
  });

  const saveToHistory = (entry: any) => {
    const newHistory = [entry, ...importHistory].slice(0, 5);
    setImportHistory(newHistory);
    localStorage.setItem('salesflow_import_history', JSON.stringify(newHistory));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: null, message: '' });
    setProgress({ current: 0, total: 0 });

    try {
      const data = await file.arrayBuffer();
      let workbook;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        const textUtf8 = new TextDecoder('utf-8').decode(data);
        const textIso = new TextDecoder('windows-1252').decode(data);
        
        // Auto-detectar se o UTF-8 quebrou os acentos (gera o caractere )
        const hasEncodingIssue = textUtf8.includes('');
        const textToParse = hasEncodingIssue ? textIso : textUtf8;

        const commaCount = (textToParse.match(/,/g) || []).length;
        const semiCount = (textToParse.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ';' : ',';
        
        // Se houver problema de enconding, forçamos o codepage 1252 no XLSX
        workbook = XLSX.read(data, { 
          type: 'array', 
          FS: delimiter, 
          ...(hasEncodingIssue && { codepage: 1252 })
        });
      } else {
        workbook = XLSX.read(data, { type: 'array' });
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error('O arquivo está vazio ou o formato não é suportado.');
      }

      const allMappedLeads: any[] = [];
      const CHUNK_SIZE_PROCESSING = 500;
      
      // Função para tratar números científicos do Excel (ex: 2.199E+10)
      const formatExcelNumber = (val: any) => {
        if (!val) return '';
        const str = String(val);
        if (str.includes('E+') || str.includes('e+')) {
          return Number(val).toLocaleString('fullwide', {useGrouping:false});
        }
        return str;
      };

      for (let i = 0; i < jsonData.length; i += CHUNK_SIZE_PROCESSING) {
        const chunk = jsonData.slice(i, i + CHUNK_SIZE_PROCESSING);
        const mappedChunk = chunk.map(row => {
          // Normalização de porte para bater com nossos filtros
          let porteRaw = row['Porte Empresa'] || row['Porte E'] || row['Porte'] || row['Porte da Empresa'] || 'N/A';
          let porte = String(porteRaw).toUpperCase();
          if (porte.includes('MICRO EM')) porte = 'MICRO EMPRESA';
          else if (porte.includes('MEI')) porte = 'MEI';
          else if (porte.includes('EPP')) porte = 'EPP';
          else if (porte.includes('DEMAIS')) porte = 'DEMAIS (MÉDIO/GRANDE)';

          return {
            cnpj: String(row['CNPJ'] || row['cnpj'] || '').replace(/\D/g, ''),
            name: row['Razão'] || row['Razão Social'] || row['Nome'] || row['Fantasia'] || 'Sem Nome',
            nome_cliente: row['Razão'] || row['Razão Social'] || row['Nome'] || row['Fantasia'] || 'Sem Nome',
            nome_fantasia: row['Fantasia'] || row['Nome Fantasia'] || '',
            address_street: row['Endereço'] || row['Logradouro'] || '',
            address_number: String(row['Número'] || row['Numero'] || row['Num'] || ''),
            address_neighborhood: row['Bairro'] || '',
            address_city: row['Cidade'] || row['Município'] || '',
            address_state: row['UF'] || row['Estado'] || '',
            address_zip: String(row['CEP'] || '').replace(/\D/g, ''),
            phone: formatExcelNumber(row['Telefone 1'] || row['Telefone'] || row['Celular'] || ''),
            phone_2: formatExcelNumber(row['Telefone 2'] || ''),
            email: row['E-mail'] || row['Email'] || row['email'] || '',
            website: row['Site'] || row['Website'] || row['url'] || '',
            cnae: row['CNAE Principal'] || row['CNAE'] || row['CNAE P'] || '',
            company_size: porte,
            capital_social: parseFloat(String(row['Capital Social da Empresa'] || row['Capital Soc'] || row['Capital Social'] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            estimated_revenue: row['Faturamento Estimado'] || row['Faturam. Est'] || row['Faturamento'] || '',
            employee_count: row['Quadro de Funcionários'] || row['Quadro de Fun'] || row['Funcionários'] || '',
            active_debts: row['Dívidas Federais Ativas'] || row['Dívidas'] || row['Dividas'] || '',
            registration_status: row['Situação Cad.'] || row['Situação'] || row['Situacao'] || 'ATIVA',
            activity_start_date: row['Data Início Atv.'] || row['Data Inicio A'] || row['Data Inicio'] || row['Abertura'] || '',
            legal_nature: row['Natureza Jurídica'] || row['Natureza'] || '',
            tax_regime: row['Regime Tributário'] || row['Regime'] || row['Enquadramento'] || '',
            partner_name: row['Nome do Sócio'] || row['Sócio'] || row['Sócio 1'] || row['Responsável'] || '',
            partner_age_range: row['Faixa Etária'] || row['Faixa Etária do Sócio'] || '',
            partner_qualification: row['Qualificação do Sócio'] || row['Qualificação'] || '',
            partner_entry_date: row['Data de Entrada'] || row['Data Entrada Sócio'] || row['Data de Entrada do Sócio'] || '',
            status: 'Novo',
            source: 'Importação Manual'
          };
        }).filter(lead => lead.cnpj && lead.cnpj.length >= 14);

        allMappedLeads.push(...mappedChunk);
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (allMappedLeads.length === 0) {
        throw new Error('Nenhum lead válido (com CNPJ) foi encontrado no arquivo.');
      }

      setProgress({ current: 0, total: allMappedLeads.length });

      const BATCH_SIZE = 100;
      for (let i = 0; i < allMappedLeads.length; i += BATCH_SIZE) {
        const chunk = allMappedLeads.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase
          .from('leads')
          .upsert(chunk, { onConflict: 'cnpj' });

        if (error) throw error;
        
        const currentProgress = Math.min(i + BATCH_SIZE, allMappedLeads.length);
        setProgress({ current: currentProgress, total: allMappedLeads.length });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const successMessage = `${allMappedLeads.length} leads importados/atualizados com sucesso!`;
      setImportStatus({ type: 'success', message: successMessage });
      
      saveToHistory({
        filename: file.name,
        count: allMappedLeads.length,
        status: 'Concluído',
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      });

    } catch (error: any) {
      console.error('Erro na importação:', error);
      const errorMessage = error.message || 'Falha ao processar o arquivo.';
      setImportStatus({ type: 'error', message: errorMessage });
      
      saveToHistory({
        filename: file.name,
        count: 0,
        status: 'Falha',
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        error: errorMessage
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-8 text-white min-h-screen bg-background pt-20 premium-gradient">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-white italic">Central de Importação</h1>
          <p className="text-metal-silver font-medium opacity-60">Faça upload de manifestos de leads, conecte repositórios em nuvem e sincronize dados corporativos.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Dropzone Card */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="md:col-span-2 glass border-dashed border-2 border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".csv, .xlsx, .xls"
            />
            
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              {isImporting ? (
                <Loader2 className="text-primary animate-spin" size={40} />
              ) : (
                <CloudUpload className="text-primary" size={40} />
              )}
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              {isImporting ? `Processando ${progress.current} de ${progress.total} leads...` : 'Solte os arquivos de governança'}
            </h3>
            <p className="text-zinc-500 text-sm mb-8 text-center max-w-sm">
              Arraste e solte arquivos <span className="text-white font-bold">CSV</span> ou <span className="text-white font-bold">XLSX</span> aqui. 
              O sistema realizará o mapeamento automático de colunas e deduplicação via CNPJ.
            </p>
            
            {importStatus.type && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                importStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {importStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span className="text-sm font-medium">{importStatus.message}</span>
              </div>
            )}

            <div className="flex gap-4">
              <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
                Selecionar Arquivos
              </button>
              <button className="glass border border-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/5 transition-all flex items-center gap-2">
                Google Drive
              </button>
            </div>
          </div>

          {/* Guidelines/Info */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-3xl bg-white/[0.02]">
              <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <Database size={16} className="text-primary" />
                Status do Pipeline
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-sm font-medium">Banco de Dados Online</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  <span className="text-sm font-medium text-zinc-400 italic">Pronto para Ingestão</span>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-3xl border-primary/20 bg-primary/5">
              <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                <CheckCircle2 size={16} />
                Deduplicação Ativa
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                O motor de importação detecta CNPJs existentes e realiza o <span className="text-white font-bold italic">upsert</span> automaticamente, preservando o histórico de interações.
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline Queue */}
        <div className="glass rounded-3xl overflow-hidden">
          <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Atividade Recente de Importação</h3>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tempo Real</span>
          </div>
          <div className="min-h-[200px]">
             {isImporting ? (
               <div className="p-12 flex flex-col items-center justify-center text-zinc-600">
                 <Loader2 className="animate-spin mb-4 text-primary" size={32} />
                 <p className="text-sm italic">Ingerindo dados: {progress.current} / {progress.total}</p>
                 <div className="w-full max-w-xs bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                   <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }} 
                   />
                 </div>
               </div>
             ) : importHistory.length > 0 ? (
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/[0.01] border-b border-white/5">
                       <th className="px-8 py-4">Arquivo</th>
                       <th className="px-6 py-4">Quantidade</th>
                       <th className="px-6 py-4">Horário</th>
                       <th className="px-6 py-4">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {importHistory.map((log, i) => (
                       <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-4 flex items-center gap-3">
                           <FileText size={18} className="text-zinc-600" />
                           <span className="text-sm font-medium">{log.filename}</span>
                         </td>
                         <td className="px-6 py-4 text-sm text-zinc-400">
                           {log.count} leads
                         </td>
                         <td className="px-6 py-4 text-xs text-zinc-500 font-mono">
                           {log.time} <span className="opacity-30 ml-2">{log.date}</span>
                         </td>
                         <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                             log.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                           }`}>
                             {log.status}
                           </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div className="p-12 flex flex-col items-center justify-center text-zinc-600">
                 <FileText className="mb-4 opacity-20" size={32} />
                 <p className="text-sm italic">Nenhuma importação ativa no momento...</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

