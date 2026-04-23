import { useState, useRef } from 'react';
import { CloudUpload, FileText, Search, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export function ImportCenter() {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: null, message: '' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const mappedLeads = jsonData.map(row => ({
        cnpj: String(row['CNPJ'] || ''),
        company_name: row['Razão'],
        name: row['Razão'] || row['Fantasia'] || 'Sem Nome',
        trading_name: row['Fantasia'],
        lead_type: row['Tipo'],
        address_street: row['Endereço'],
        address_number: String(row['Número'] || ''),
        address_complement: row['Complemento'],
        address_neighborhood: row['Bairro'],
        address_city: row['Cidade'],
        address_state: row['UF'],
        ibge_code: String(row['Cód. IBGE'] || ''),
        address_zip: String(row['CEP'] || ''),
        phone: String(row['Telefone 1'] || ''),
        secondary_phone: String(row['Telefone 2'] || ''),
        email: row['E-mail'],
        website: row['Site'],
        cnae: row['CNAE Principal'],
        cnae_text: row['Texto CNAE Principal'],
        cnae_secondary: row['CNAE Secundário'],
        matrix_branch: row['Matriz/Filial'],
        federal_entity: row['Ente Federativo'],
        registration_status: row['Situação Cad.'],
        registration_status_date: row['Data Situação Cad.'],
        legal_nature: row['Natureza Jurídica'],
        opening_date: row['Data Início Atv.'],
        is_mei: String(row['Opção pelo MEI']).toLowerCase().includes('sim'),
        mei_entry_date: row['Data entrada MEI'],
        mei_exit_date: row['Data exclusão MEI'],
        special_programs: row['Programas Especiais'],
        company_size: row['Porte Empresa'],
        tax_regime: row['Regime Tributário'],
        simples_entry_date: row['Data Opção Simples'],
        simples_exit_date: row['Data Exclusão Simples'],
        share_capital: Number(row['Capital Social da Empresa'] || 0),
        first_partner_id: row['Identificador 1º Sócio'],
        partner_name: row['Nome do Sócio'],
        age_range: row['Faixa Etária'],
        partner_cpf_cnpj: row['CPF/CNPJ do Sócio'],
        qualification: row['Qualificação'],
        entry_date: row['Data da Entrada'],
        estimated_revenue: Number(row['Faturamento Estimado'] || 0),
        employee_count: Number(row['Quadro de Funcionários'] || 0),
        active_federal_debts: row['Dívidas Federais Ativas'],
        total_debts: Number(row['Total Dívidas'] || 0),
        status: 'Novo',
        source: 'Importação Manual'
      })).filter(lead => lead.cnpj);

      const { error } = await supabase
        .from('leads')
        .upsert(mappedLeads, { onConflict: 'cnpj' });

      if (error) throw error;

      setImportStatus({ 
        type: 'success', 
        message: `${mappedLeads.length} leads importados/atualizados com sucesso!` 
      });
    } catch (error: any) {
      console.error('Erro na importação:', error);
      setImportStatus({ 
        type: 'error', 
        message: 'Falha ao processar o arquivo. Verifique o formato e as colunas.' 
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
              {isImporting ? 'Processando dados...' : 'Solte os arquivos de governança'}
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

        {/* Pipeline Queue Placeholder */}
        <div className="glass rounded-3xl overflow-hidden">
          <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Atividade Recente de Importação</h3>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tempo Real</span>
          </div>
          <div className="p-8 flex flex-col items-center justify-center text-zinc-600 min-h-[200px]">
             {isImporting ? (
               <>
                 <Loader2 className="animate-spin mb-4 text-primary" size={32} />
                 <p className="text-sm italic">Ingerindo dados no Supabase...</p>
               </>
             ) : (
               <>
                 <FileText className="mb-4 opacity-20" size={32} />
                 <p className="text-sm italic">Nenhuma importação ativa no momento...</p>
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

