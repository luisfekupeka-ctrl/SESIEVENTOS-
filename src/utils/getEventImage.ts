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
  
  return null;
};
