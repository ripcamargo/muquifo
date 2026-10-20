// ─────────────────────────────────────────────────────────────────────────────
// Conteúdo editável do site. Altere os textos aqui — não é preciso mexer nos componentes.
// Itens marcados com [CONFIRMAR] são provisórios: revise antes de publicar.
// Campos vazios ('' ou []) simplesmente não aparecem no site.
// ─────────────────────────────────────────────────────────────────────────────
import type { LucideIcon } from 'lucide-react';
import { DoorOpen, Drum, Mic } from 'lucide-react';
import type { ServiceType } from '../types';

export const studio = {
  name: 'Muquifo Home Studio',
  shortName: 'Muquifo',

  /** WhatsApp do estúdio: só dígitos, com código do país. */
  whatsapp: '5515998110938',
  whatsappDisplay: '+55 15 99811-0938',

  hero: {
    eyebrow: 'Homestudio · Ensaios, gravinas e viagens espaciais',
    titleLines: ['Chega mais,', 'A sala é sua.'],
    subtitle:
      'Estúdio disponível para ensaios, gravações, podcasts, ensaios fotográficos e o que mais der na telha. Tudo pronto para você sem complicação.',
  },

  about: {
    title: 'Muquifo aconchegante e acessível pra tua arte',
    // [CONFIRMAR] Texto provisório — conte a história do estúdio com suas palavras.
    paragraphs: [
      'O Muquifo é um homestudio localizado em Sorocaba/SP projetado com muito carinho (e bastante calma) para quem quer tocar seus projetos sem complicação: é chegar, ligar os cabos e fazer barulho.',
      'Paredes tratadas, isolamento acústico, luz baixa e os equipamentos prontos na sala. Um espaço pequeno, de verdade, pensado para ensaios e gravações.',
      'Estúdio de bairro, com preço acessível e sem frescura. Muitas histórias desde 2017, que agora passa a ser aberta ao público. Cola com a gente!',
    ],
    /** [CONFIRMAR] Cidade/região de atendimento. Ex.: 'Sorocaba – SP'. Vazio = não exibe. */
    location: '',
    /** Exibido no lugar do endereço. Ajuste se preferir divulgar o endereço completo. */
    locationNote: 'Piazza di Roma, zona oeste de Sorocaba/SP (endereço completo fornecido após reserva)',
    /** [CONFIRMAR] Itens visíveis nas fotos. Confira, complete com marcas/modelos ou remova. */
    equipment: [
      'Bateria completa (com opção de aluguel de pratos)',
      'Amp de guitarra - Meteoro Nitrous 100g (100W) 2x10',
      'Amp de guitarra - Meteoro Demolidor FWB-20 (20W) 1x10',
      'Cubo de baixo - Voxstorm Cube Bass 125 (75W) 1x12',
      'Mesa de som Behringer Xenyx 1202FX',
      'PA Ativo Staner SR-315A 300w RMS + PA Ativo Mark Audio 1200 200w RMS',
      'Ar Condionado',
    ],
    /** [CONFIRMAR] Diferenciais reais do estúdio. Vazio = não exibe. */
    highlights: [] as string[],
    /** [CONFIRMAR] Tipos de trabalho realizados. Vazio = não exibe. */
    workTypes: ['Ensaios de bandas', 'Gravação de instrumentos e voz', 'Produção musical, audiovisual e ensaios fotográficos', 'Locação da sala para aulas de música, podcasts, atividades em geral'],
  },

  privacy: {
    /** Atualize a data sempre que mudar o texto da política. */
    version: '2026-10-20',
    controller: 'Muquifo Home Studio',
    /** [CONFIRMAR] Prazo de guarda dos dados de pedidos. */
    retention: 'até 12 meses após o último contato',
  },
} as const;

export interface ServiceInfo {
  id: ServiceType;
  name: string;
  /** Usado em frases: "Agendar ensaio". */
  verb: string;
  icon: LucideIcon;
  summary: string;
  audience: string;
  /** Campos extras pedidos na etapa de detalhes. */
  fields: {
    projectLabel: string;
    askPeople: boolean;
    askDescription: boolean;
    descriptionLabel?: string;
    descriptionHint?: string;
    /** Rótulo curto da descrição na mensagem do WhatsApp e no painel. */
    descriptionShort?: string;
  };
}

/** Para adicionar um serviço: inclua aqui, em ServiceType (src/types) e nas regras do Firestore. */
export const services: ServiceInfo[] = [
  {
    id: 'ensaio',
    name: 'Ensaio musical',
    verb: 'ensaio',
    icon: Drum,
    summary: 'Sala pronta para a banda passar o repertório, testar arranjos e afinar o som.',
    audience: 'Para bandas, músicos e projetos musicais.',
    fields: { projectLabel: 'Nome da banda ou projeto', askPeople: true, askDescription: false },
  },
  {
    id: 'gravacao',
    name: 'Gravação',
    verb: 'gravação',
    icon: Mic,
    summary: 'Horário reservado para registrar instrumentos, voz e ideias com a estrutura da sala.',
    audience: 'Para artistas, bandas e projetos compatíveis com a estrutura do estúdio.',
    fields: {
      projectLabel: 'Artista, banda ou projeto',
      askPeople: false,
      askDescription: true,
      descriptionLabel: 'O que você quer gravar?',
      descriptionHint: 'Ex.: voz e violão de 2 músicas, guia de bateria…',
      descriptionShort: 'O que quero gravar',
    },
  },
  {
    id: 'locacao',
    name: 'Locação de sala',
    verb: 'locação',
    icon: DoorOpen,
    summary: 'A sala por algumas horas para o que você precisar: podcast, ensaio fotográfico, vídeo, aula ou reunião criativa.',
    audience: 'Para criadores, fotógrafos e projetos que precisam de um espaço com cara de estúdio.',
    fields: {
      projectLabel: 'Nome do projeto ou empresa',
      askPeople: true,
      askDescription: true,
      descriptionLabel: 'Para que você vai usar a sala?',
      descriptionHint: 'Ex.: gravar um episódio de podcast, ensaio fotográfico da banda…',
      descriptionShort: 'Finalidade',
    },
  },
];

export function serviceInfo(id: ServiceType): ServiceInfo {
  return services.find((s) => s.id === id) ?? services[0];
}
