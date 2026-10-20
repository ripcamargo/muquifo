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
    eyebrow: 'Home studio · Ensaios, gravações e locação',
    titleLines: ['Liga o amp.', 'A sala é sua.'],
    subtitle:
      'Reserve a sala para ensaiar, gravar ou tocar o seu projeto — de 1 hora a uma tarde inteira. Escolha o dia, veja os períodos livres e envie o pedido pelo WhatsApp.',
  },

  about: {
    title: 'Um muquifo feito pra tocar',
    // [CONFIRMAR] Texto provisório — conte a história do estúdio com suas palavras.
    paragraphs: [
      'O Muquifo é um home studio montado para quem quer tocar sem complicação: chegar, ligar os cabos e fazer barulho.',
      'Paredes revestidas, luz baixa e os equipamentos prontos na sala. Um espaço pequeno, de verdade, pensado para ensaios e gravações.',
    ],
    /** [CONFIRMAR] Cidade/região de atendimento. Ex.: 'Sorocaba – SP'. Vazio = não exibe. */
    location: '',
    /** Exibido no lugar do endereço. Ajuste se preferir divulgar o endereço completo. */
    locationNote: 'O endereço é enviado pelo WhatsApp junto com a confirmação do horário.',
    /** [CONFIRMAR] Itens visíveis nas fotos. Confira, complete com marcas/modelos ou remova. */
    equipment: [
      'Bateria completa com pratos',
      'Amplificadores de guitarra',
      'Teclado',
      'Mesa de som',
      'Caixas de som',
      'Microfone com pedestal',
      'Cajón',
    ],
    /** [CONFIRMAR] Diferenciais reais do estúdio. Vazio = não exibe. */
    highlights: [] as string[],
    /** [CONFIRMAR] Tipos de trabalho realizados. Vazio = não exibe. */
    workTypes: ['Ensaios de bandas', 'Gravação de instrumentos e voz', 'Locação da sala para podcasts e ensaios fotográficos'],
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
