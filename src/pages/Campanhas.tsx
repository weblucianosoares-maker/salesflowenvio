import { useState, useEffect } from 'react';
import { Bold, Italic, Link, Paperclip, Edit3, Tag, Zap, Eye, Users, Send, Clock, AlertTriangle, Settings, CheckCircle2, Loader2, Play, Pause, Trash2, FileText, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailConfig {
  smtp_user: string;
  smtp_pass: string;
  sender_name: string;
  daily_limit: number;
  batch_size: number;
  interval_minutes: number;
}

export function Campanhas() {
  const [leadCount, setLeadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState<EmailConfig>({
    smtp_user: '',
    smtp_pass: '',
    sender_name: '',
    daily_limit: 200,
    batch_size: 30,
    interval_minutes: 20
  });

  const templates = [
    {
      id: 1,
      name: "Opção 1: Autoridade e Localização",
      subject: "Gestão de benefícios para a {{Razão}} em {{Cidade}}",
      body: "Olá, {{Nome_do_Sócio}}.\n\nAcompanhando o mercado de {{Texto_CNAE_Principal}} aqui no Rio de Janeiro, notei que a {{Fantasia}} tem se destacado no setor de {{Porte_Empresa}}. Sou Luciano Soares, consultor especializado em saúde empresarial, e trabalho ajudando empresas com o perfil da sua a reduzirem em até 30% o custo fixo com planos de saúde, sem perder a qualidade da rede referenciada.\n\nComo vocês estão situados em {{Bairro}}, existem opções regionais e nacionais que se encaixam muito bem no quadro de {{Quadro_de_Funcionários}} colaboradores que vocês possuem.\n\nTeria 5 minutos para uma breve conversa por telefone no número {{Telefone_1}} ainda esta semana?"
    },
    {
      id: 2,
      name: "Opção 2: Redução de Custos (RevOps)",
      subject: "Eficiência operacional e saúde: Estratégia para a {{Fantasia}}",
      body: "Bom dia, {{Nome_do_Sócio}}.\n\nVi que a {{Razão}} opera sob o regime {{Regime_Tributário}}. Muitas empresas desse porte acabam pagando taxas abusivas em benefícios por falta de uma gestão estratégica de sinistralidade.\n\nMeu trabalho é implementar uma 'unidade de receita' indireta, otimizando seus contratos de saúde para que o valor economizado possa ser reinvestido na operação da sua empresa em {{Cidade}}. Analisei que vocês possuem um faturamento estimado de {{Faturamento_Estimado}}, o que os coloca em uma categoria de negociação exclusiva junto às operadoras.\n\nPodemos validar se o seu contrato atual está atualizado com as novas tabelas de 2026?"
    },
    {
      id: 3,
      name: "Opção 3: Direta e Curta (Mobile)",
      subject: "Pergunta rápida para o sócio da {{Fantasia}}",
      body: "Oi, {{Nome_do_Sócio}}, tudo bem?\n\nSou o Luciano, consultor de benefícios. Estou entrando em contato porque vi que a {{Fantasia}} atua em {{Cidade}} e gostaria de saber: quem é a pessoa responsável hoje por revisar os custos de plano de saúde e benefícios dos seus {{Quadro_de_Funcionários}} funcionários?\n\nTenho uma análise de mercado específica para o setor de {{Texto_CNAE_Principal}} que pode interessar vocês.\n\nUm abraço,"
    }
  ];

  useEffect(() => {
    fetchLeadCount();
    fetchConfig();
  }, []);

  const fetchLeadCount = async () => {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    setLeadCount(count || 0);
  };

  const fetchConfig = async () => {
    const { data } = await supabase.from('email_configs').select('*').single();
    if (data) setConfig(data);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      // Remover campos nulos ou ids vazios para evitar erro de upsert
      const { id, ...configData } = config as any;
      const dataToSave = id ? { ...configData, id } : configData;

      const { error } = await supabase
        .from('email_configs')
        .upsert(dataToSave);
      
      if (error) throw error;
      setShowSettings(false);
      alert('Configurações salvas com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar: ${err.message || 'Verifique se a tabela email_configs foi criada no Supabase.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaunch = async () => {
    if (!config.smtp_user || !config.smtp_pass) {
      alert('Conecte seu Gmail nas configurações antes de lançar.');
      setShowSettings(true);
      return;
    }
    
    if (!subject || !message) {
      alert('Preencha o assunto e a mensagem da campanha.');
      return;
    }

    const confirm = window.confirm(`Deseja lançar esta campanha para ${leadCount} leads? Os envios serão fracionados em lotes de ${config.batch_size} a cada ${config.interval_minutes} minutos.`);
    
    if (confirm) {
      setIsSaving(true);
      try {
        // 1. Criar a Campanha
        const { data: campaign, error: cError } = await supabase
          .from('campaigns')
          .insert({
            name: `Campanha ${new Date().toLocaleDateString()}`,
            subject,
            body: message,
            status: 'active'
          })
          .select()
          .single();

        if (cError) throw cError;

        // 2. Buscar todos os leads para popular a fila
        const { data: leads, error: lError } = await supabase
          .from('leads')
          .select('*');

        if (lError) throw lError;

        // 3. Preparar a fila (em lotes para não travar o navegador)
        const queueItems = leads.map(lead => {
          // Lógica de Fallback (Dica do Vibe Code)
          let fallbackNome = lead.partner_name || lead.nome_cliente || 'Responsável';
          if (fallbackNome.length <= 3 || !isNaN(Number(fallbackNome))) {
            fallbackNome = 'Responsável pela ' + (lead.nome_fantasia || lead.name || 'empresa');
          }

          let personalizedBody = message
            .replace(/{{Name}}/gi, lead.name || '')
            .replace(/{{Partner}}/gi, fallbackNome)
            .replace(/{{City}}/gi, lead.address_city || '')
            .replace(/{{Sector}}/gi, lead.cnae || '')
            .replace(/{{Razão}}/gi, lead.name || '')
            .replace(/{{Fantasia}}/gi, lead.nome_fantasia || lead.name || '')
            .replace(/{{Nome_do_Sócio}}/gi, fallbackNome)
            .replace(/{{Cidade}}/gi, lead.address_city || '')
            .replace(/{{Texto_CNAE_Principal}}/gi, lead.cnae || '')
            .replace(/{{Porte_Empresa}}/gi, lead.company_size || 'empresa')
            .replace(/{{Bairro}}/gi, lead.address_neighborhood || 'sua região')
            .replace(/{{Quadro_de_Funcionários}}/gi, lead.employee_count || 'seus')
            .replace(/{{Telefone_1}}/gi, lead.phone || '')
            .replace(/{{Regime_Tributário}}/gi, lead.regime_tributario || 'seu regime atual')
            .replace(/{{Faturamento_Estimado}}/gi, lead.estimated_revenue || 'seu porte');

          let personalizedSubject = subject
            .replace(/{{Name}}/gi, lead.name || '')
            .replace(/{{Partner}}/gi, fallbackNome)
            .replace(/{{City}}/gi, lead.address_city || '')
            .replace(/{{Sector}}/gi, lead.cnae || '')
            .replace(/{{Razão}}/gi, lead.name || '')
            .replace(/{{Fantasia}}/gi, lead.nome_fantasia || lead.name || '')
            .replace(/{{Nome_do_Sócio}}/gi, fallbackNome)
            .replace(/{{Cidade}}/gi, lead.address_city || '');

          return {
            campaign_id: campaign.id,
            lead_id: lead.id,
            recipient_email: lead.email,
            subject: personalizedSubject,
            body_html: personalizedBody,
            status: 'pending',
            scheduled_for: new Date(Date.now() + 1000).toISOString() // Começa agora
          };
        }).filter(item => item.recipient_email);

        // Inserir na fila em pedaços de 100
        for (let i = 0; i < queueItems.length; i += 100) {
          const chunk = queueItems.slice(i, i + 100);
          const { error: qError } = await supabase.from('email_queue').insert(chunk);
          if (qError) throw qError;
        }

        alert('Campanha lançada e fila gerada com sucesso! O motor de envio começará a processar os lotes.');
      } catch (err) {
        console.error(err);
        alert('Erro ao lançar campanha. Verifique se as tabelas foram criadas no Supabase.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="p-8 text-white min-h-screen bg-background pt-20 premium-gradient">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Campanhas de E-mail</h2>
          <p className="text-metal-silver font-medium opacity-60">Crie sequências de e-mail personalizadas com lógica de gotejamento.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="glass border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <Settings size={18} />
            CONFIGURAR GMAIL
          </button>
          <button 
            onClick={handleLaunch}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Send size={18} />
            LANÇAR CAMPANHA
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="glass rounded-3xl p-8 mb-8 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Settings className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Configurações de Envio (Gmail)</h3>
              <p className="text-xs text-zinc-500">Use uma "Senha de App" do Google para conectar com segurança.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">E-mail do Gmail</label>
                <input 
                  type="email" 
                  value={config.smtp_user}
                  onChange={(e) => setConfig({...config, smtp_user: e.target.value})}
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  placeholder="seu-email@gmail.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">Senha de App</label>
                <input 
                  type="password" 
                  value={config.smtp_pass}
                  onChange={(e) => setConfig({...config, smtp_pass: e.target.value})}
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  placeholder="xxxx xxxx xxxx xxxx"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">Nome do Remetente</label>
                <input 
                  type="text" 
                  value={config.sender_name}
                  onChange={(e) => setConfig({...config, sender_name: e.target.value})}
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  placeholder="Seu Nome ou Empresa"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">Lote (Batch)</label>
                  <input 
                    type="number" 
                    value={config.batch_size}
                    onChange={(e) => setConfig({...config, batch_size: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">Intervalo (Min)</label>
                  <input 
                    type="number" 
                    value={config.interval_minutes}
                    onChange={(e) => setConfig({...config, interval_minutes: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-2">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  <span className="text-white font-bold">Dica de Segurança:</span> O Gmail Comum tem limite de ~500 envios/dia. Recomendamos manter o limite diário em <span className="text-primary font-bold">200</span> para evitar marcação como SPAM.
                </p>
              </div>
              <button 
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                SALVAR CONFIGURAÇÕES
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-12 gap-8">
        {/* Editor & Config */}
        <div className="col-span-8 space-y-6">
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5 relative">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Edit3 className="text-primary" size={20} />
                </div>
                <h3 className="font-bold text-lg">Composição do E-mail</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button 
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-sm font-bold text-primary transition-colors border border-primary/20"
                  >
                    <FileText size={16} />
                    Modelos Prontos
                    <ChevronDown size={16} />
                  </button>
                  {showTemplates && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1b1e] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {templates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSubject(t.subject);
                            setMessage(t.body);
                            setShowTemplates(false);
                          }}
                          className="w-full text-left px-5 py-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                        >
                          <p className="text-sm font-bold text-white mb-1">{t.name}</p>
                          <p className="text-xs text-zinc-400 truncate">{t.subject}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 border-l border-white/10 pl-4">
                  {[Bold, Italic, Link, Paperclip].map((Icon, i) => (
                    <button key={i} className="p-2.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">Assunto</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white focus:ring-1 focus:ring-primary outline-none font-medium" 
                  placeholder="Ex: Oportunidade de Parceria Estratégica para {{Partner}}" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 px-1">Mensagem</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
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
                {['Razão', 'Fantasia', 'Nome_do_Sócio', 'Cidade', 'Texto_CNAE_Principal', 'Porte_Empresa', 'Bairro', 'Quadro_de_Funcionários', 'Telefone_1'].map((tag) => (
                  <span 
                    key={tag} 
                    onClick={() => setMessage(prev => prev + ` {{${tag}}}`)}
                    className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {"{{" + tag + "}}"}
                  </span>
                ))}
              </div>
            </div>
            <div className="glass p-6 rounded-3xl border-blue-500/20 bg-blue-500/5">
              <h4 className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={14}/> 
                Configuração "Drip" Ativa
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 italic">Lotes de {config.batch_size} e-mails</span>
                  <span className="text-zinc-500 italic">Intervalo: {config.interval_minutes} min</span>
                </div>
                <div className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-widest text-center">
                  MODO SEGURO GMAIL COMUM
                </div>
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
             <p className="text-xs text-zinc-600 px-8">Selecione um lead na tabela para visualizar a renderização final personalizada.</p>
          </div>
          
          <div className="glass p-8 rounded-3xl bg-emerald-500/[0.02] border-emerald-500/10">
            <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">Alcance da Campanha</h4>
            <div className="flex items-end gap-2">
              <p className="text-5xl font-black text-white tracking-tighter">{leadCount.toLocaleString()}</p>
              <span className="text-sm font-medium text-emerald-500 mb-2 flex items-center gap-1">
                Leads <Users size={14} />
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <Clock size={12} />
              Tempo total de envio: {Math.ceil((leadCount / config.batch_size) * config.interval_minutes / 60)} horas
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border-amber-500/20 bg-amber-500/5">
            <div className="flex gap-4">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <div>
                <h5 className="text-sm font-bold text-amber-500 mb-1">Dica de Segurança</h5>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Para o Gmail Comum, não ultrapasse 200 envios por dia. Seus parâmetros atuais levarão {Math.ceil(leadCount / 200)} dias para completar.
                </p>
              </div>
            </div>
          </div>
        {/* Pipeline Queue / Status */}
        <div className="glass rounded-3xl overflow-hidden">
          <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Monitor de Envio Fracionado</h3>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Processando Fila
            </span>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Aguardando</p>
              <p className="text-2xl font-black text-white">---</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Enviados</p>
              <p className="text-2xl font-black text-emerald-500">0</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Próximo Lote</p>
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <Clock size={14} className="text-amber-500"/> em 18 minutos
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 transition-all">
                <Pause size={18} />
              </button>
              <button className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

