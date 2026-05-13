export const getMarketFromCNAE = (cnae: any) => {
  if (!cnae) return 'Não identificado';
  const str = String(cnae);
  const code = str.replace(/\D/g, '').substring(0, 2);
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
