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

    if (leadError || !lead) throw new Error('Lead nao encontrado');

    const companyName = lead.name || lead.nome_cliente;
    const city = lead.address_city || '';
    const partnerName = lead.partner_name || '';

    // 2. Realizar busca (Simulando busca via Serper.dev)
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
    let textResponse = null;
    let geminiRawData = null;
    let aiError = null;

    if (geminiKey) {
      const prompt = `
        Com base nos resultados de busca abaixo para a empresa "${companyName}" em "${city}", extraia as seguintes informacoes em JSON:
        - website: URL do site oficial
        - instagram: URL do perfil no Instagram
        - linkedin: URL da pagina da empresa no LinkedIn
        - facebook: URL da pagina no Facebook
        - partner_linkedin: URL do LinkedIn do socio "${partnerName}"
        - ai_summary: Um resumo de 2 frases sobre o que a empresa faz e sua presenca de mercado.
        - enriched_phone: Numero de telefone atualizado encontrado no Google Meu Negocio ou site oficial (formate com DDD).
        - enriched_email: E-mail de contato atualizado encontrado no site ou Google Meu Negocio.
        - gmb_rating: Nota de avaliacao da empresa no Google (ex: "4.8").
        - gmb_review_count: Quantidade de avaliacoes no Google (ex: "150").

        Resultados de busca:
        ${searchResults || "Nenhum resultado encontrado. Tente deduzir com base no nome."}

        Responda APENAS o JSON. Se nao encontrar algo, retorne null para o campo.
      `;

      // Use gemini-flash-latest which is the supported fast model
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });

      geminiRawData = await geminiRes.json();
      
      if (geminiRawData.error) {
        aiError = geminiRawData.error.message;
        console.error("Gemini Error:", aiError);
        
        // Fetch list of available models to debug
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
        const modelsData = await modelsRes.json();
        const availableModels = modelsData.models ? modelsData.models.map(m => m.name).join(", ") : "Nenhum";
        aiError += ` | Modelos permitidos: ${availableModels}`;
      } else {
        textResponse = geminiRawData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        try {
          enrichedData = JSON.parse(textResponse.replace(/```json|```/g, ''));
        } catch (e) {
          console.error("Failed to parse Gemini response:", textResponse);
          aiError = "Failed to parse JSON response from AI.";
        }
      }
    }

    // Se houve dados extraidos validos e o JSON nao estiver vazio
    if (Object.keys(enrichedData).length > 0) {
      const { error: updateError } = await supabase
        .from('leads')
        .update(enrichedData)
        .eq('id', leadId);

      if (updateError) throw updateError;
    } else {
      if (aiError) {
        throw new Error(`Erro na IA: ${aiError}`);
      } else {
        throw new Error("A IA nao encontrou informacoes novas para este lead.");
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      lead: enrichedData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
