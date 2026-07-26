export const getEventImage = (eventName: string): string | null => {
  const n = eventName.toLowerCase();
  
  if (n.includes('street jazz')) return '/images/events/street_jazz.png';
  if (n.includes('ilustração') || n.includes('ilustracao')) return '/images/events/ilustracao.png';
  if (n.includes('futsal')) return '/images/events/futsal.png';
  if (n.includes('tênis de mesa') || n.includes('tenis de mesa')) return '/images/events/tenis_de_mesa.png';
  if (n.includes('circo')) return '/images/events/circo.png';
  if (n.includes('clube da música') || n.includes('clube da musica')) return '/images/events/clube_da_musica.png';
  if (n.includes('robótica') || n.includes('robotica')) return '/images/events/robotica.png';
  if (n.includes('vôlei') || n.includes('volei')) return '/images/events/volei.png';
  if (n.includes('xadrez')) return '/images/events/xadrez.png';
  if (n.includes('teatro')) return '/images/events/teatro.png';
  if (n.includes('yoga')) return '/images/events/yoga.png';
  if (n.includes('culinária') || n.includes('culinaria')) return '/images/events/culinaria.png';
  if (n.includes('inglês') || n.includes('english')) return '/images/events/ingles.png';
  if (n.includes('cosmética') || n.includes('cosmetica')) return '/images/events/cosmetica.png';
  if (n.includes('sketchbook')) return '/images/events/sketchbook.png';
  if (n.includes('crochê') || n.includes('croche')) return '/images/events/croche.png';
  if (n.includes('curso de desenho')) return '/images/events/curso_de_desenho.png';
  if (n.includes('dança terapia') || n.includes('danca terapia')) return '/images/events/danca_terapia.png';
  if (n.includes('desenho técnico') || n.includes('desenho tecnico')) return '/images/events/desenho_tecnico.png';
  if (n.includes('futebol de botão') || n.includes('futebol de botao')) return '/images/events/futebol_de_botao.png';
  if (n.includes('gabarita sesi') || n.includes('gabarita')) return '/images/events/gabarita_sesi.png';
  if (n.includes('desenho em mesa digital') || n.includes('mesa digital')) return '/images/events/desenho_digital.png';
  if (n.includes('geocraft')) return '/images/events/geocraft.png';
  if (n.includes('karaokê') || n.includes('karaoke')) return '/images/events/karaoke.png';
  if (n.includes('k-pop') || n.includes('kpop')) return '/images/events/kpop.png';
  if (n.includes('violino') || n.includes('musicalização') || n.includes('musicalizacao')) return '/images/events/violino.png';
  if (n.includes('taekwondo') || n.includes('muay thai') || n.includes('muaythai')) return '/images/events/artes_marciais.png';
  if (n.includes('rpg') || n.includes('vintage game') || n.includes('vintage')) return '/images/events/jogos_vintage.png';
  if (n.includes('leitura') || n.includes('quadrinhos')) return '/images/events/oficina_leitura.png';
  
  return null;
};
