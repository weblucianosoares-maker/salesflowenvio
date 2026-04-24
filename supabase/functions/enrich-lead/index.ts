import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar dados do lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) throw new Error('Lead não encontrado');

    const companyName = lead.name || lead.nome_cliente;
    const city = lead.address_city || '';
    const partnerName = lead.partner_name || '';

    // 2. Realizar busca (Simulando busca via Serper.dev)
    // Nota: O usuário deve configurar a variável de ambiente SERPER_API_KEY
    const serperKey = Deno.env.get('SERPER_API_KEY');
    let searchResults = "";

    if (serperKey) {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${companyName} ${city} site oficial redes sociais instagram linkedin`,
          num: 10
        }),
      });
      const data = await response.json();
      searchResults = JSON.stringify(data);
    }

    // 3. Usar Gemini para processar os resultados
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    let enrichedData = {};

    if (geminiKey) {
      const prompt = `
        Com base nos resultados de busca abaixo para a empresa "${companyName}" em "${city}", extraia as seguintes informações em JSON:
        - website: URL do site oficial
        - instagram: URL do perfil no Instagram
        - linkedin: URL da página da empresa no LinkedIn
        - facebook: URL da página no Facebook
        - partner_linkedin: URL do LinkedIn do sócio "${partnerName}"
        - ai_summary: Um resumo de 2 frases sobre o que a empresa faz e sua presença de mercado.

        Resultados de busca:
        ${searchResults || "Nenhum resultado encontrado. Tente deduzir com base no nome."}

        Responda APENAS o JSON. Se não encontrar algo, retorne null para o campo.
      `;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });

      const geminiData = await geminiRes.json();
      const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      enrichedData = JSON.parse(textResponse.replace(/```json|```/g, ''));
    }

    // 4. Atualizar o lead
    const { error: updateError } = await supabase
      .from('leads')
      .update(enrichedData)
      .eq('id', leadId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, lead: enrichedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
