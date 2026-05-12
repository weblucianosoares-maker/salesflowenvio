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
    const { query, location } = await req.json();

    const serperKey = Deno.env.get('SERPER_API_KEY');
    if (!serperKey) throw new Error('SERPER_API_KEY não configurada');

    const response = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${query} em ${location}`,
        num: 20
      }),
    });

    const data = await response.json();
    
    // Mapear resultados para o formato do Lead
    const leads = data.places?.map((place: any) => ({
      name: place.title,
      nome_cliente: place.title,
      address_street: place.address,
      address_city: location,
      phone: place.phoneNumber,
      website: place.website,
      rating: place.rating,
      reviews: place.ratingCount,
      category: place.category,
      cid: place.cid, // ID do Google Maps
      source: 'Prospecção Externa'
    })) || [];

    return new Response(JSON.stringify({ success: true, leads }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
