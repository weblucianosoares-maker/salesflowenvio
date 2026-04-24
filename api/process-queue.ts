import { createClient } from '@supabase/supabase-js';
import * as nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis do Supabase não configuradas no ambiente (Vercel).');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar as configurações de e-mail (SMTP)
    const { data: config, error: configError } = await supabase
      .from('email_configs')
      .select('*')
      .single();

    if (configError || !config) {
      throw new Error('Configuração de SMTP não encontrada no banco.');
    }

    // 2. Buscar os próximos emails pendentes baseando-se no limite/batch
    const { data: pendingEmails, error: queueError } = await supabase
      .from('email_queue')
      .select('id, recipient_email, subject, body_html, lead_id')
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true })
      .limit(config.batch_size || 30);

    if (queueError) {
      throw new Error(`Erro ao buscar fila: ${queueError.message}`);
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return res.status(200).json({ message: 'Nenhum e-mail pendente na fila.', processed: 0 });
    }

    // 3. Configurar o transportador do Nodemailer (Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    });

    let successCount = 0;
    let errorCount = 0;

    // 4. Processar e enviar os e-mails
    for (const email of pendingEmails) {
      try {
        await transporter.sendMail({
          from: `"${config.sender_name || 'SalesFlow'}" <${config.smtp_user}>`,
          to: email.recipient_email,
          subject: email.subject,
          html: email.body_html.replace(/\n/g, '<br/>'),
        });

        // Atualizar status para enviado
        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', email.id);

        if (email.lead_id) {
          // Move o lead no funil
          await supabase
            .from('leads')
            .update({ pipeline_stage: 'E-mail Enviado' })
            .eq('id', email.lead_id);
            
          // Registra o histórico
          await supabase
            .from('lead_activities')
            .insert({
              lead_id: email.lead_id,
              activity_type: 'email',
              content: `E-mail enviado: ${email.subject}`
            });
        }

        successCount++;
      } catch (err: any) {
        console.error(`Erro ao enviar para ${email.recipient_email}:`, err.message);
        
        // Atualizar status para erro
        await supabase
          .from('email_queue')
          .update({ status: 'error', error_message: err.message })
          .eq('id', email.id);
          
        errorCount++;
      }
      
      // Delay simples entre e-mails para evitar bloqueios do provedor
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return res.status(200).json({ 
      message: 'Fila processada com sucesso.',
      processed: successCount,
      errors: errorCount
    });

  } catch (error: any) {
    console.error('Erro na Vercel Function:', error);
    return res.status(500).json({ error: error.message });
  }
}
