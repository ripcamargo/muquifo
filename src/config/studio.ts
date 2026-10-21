// ─────────────────────────────────────────────────────────────────────────────
// Conteúdo editável do site. Altere os textos aqui — não é preciso mexer nos componentes.
// Itens marcados com [CONFIRMAR] são provisórios: revise antes de publicar.
// Campos vazios ('' ou []) simplesmente não aparecem no site.
// ─────────────────────────────────────────────────────────────────────────────
import type { LucideIcon } from 'lucide-react';
import { DoorOpen, Drum, Mic } from 'lucide-react';
import type { ServiceType } from '../types';

export const studio = {
  name: 'Muquifo Homestudio',
  shortName: 'Muquifo',

  /** WhatsApp do estúdio: só dígitos, com código do país. */
  whatsapp: '5515998110938',
  whatsappDisplay: '+55 15 99811-0938',

  hero: {
    eyebrow: 'Ensaios, gravinas e viagens espaciais',
    subtitle:
      'Estúdio disponível para ensaios, gravações, podcasts, ensaios fotográficos e o que mais der na telha. Tudo pronto para você, sem complicação.',
  },

  about: {
    title: 'Aconchegante e acessível pra tua arte',
    // [CONFIRMAR] Texto provisório — conte a história do estúdio com suas palavras.
    paragraphs: [
      'Localizado em Sorocaba/SP, o Muquifo é nosso cantinho desde 2017. Depois de tantas histórias, ensaios e momentos vividos por aqui, chegou a hora de abrir as portas e deixar você fazer parte delas também.',
      'Um espaço feito pra quem quer tirar as ideias do papel, juntar a banda e fazer som sem complicação. É chegar, plugar os instrumentos e tocar.',
      'Somos um estúdio de bairro, compacto, autêntico, com preço acessível e sem frescura. Cola com a gente!',
    ],
    /** [CONFIRMAR] Cidade/região de atendimento. Ex.: 'Sorocaba – SP'. Vazio = não exibe. */
    location: 'Sorocaba/SP',
    /** Exibido no lugar do endereço. Ajuste se preferir divulgar o endereço completo. */
    locationNote: 'Piazza di Roma',
    /** [CONFIRMAR] Diferenciais reais do estúdio. Vazio = não exibe. */
    highlights: [] as string[],
    /** [CONFIRMAR] Tipos de trabalho realizados. Vazio = não exibe. */
    workTypes: ['Ensaios de bandas', 'Gravação de instrumentos e voz', 'Produção musical, audiovisual e ensaios fotográficos', 'Locação da sala para aulas de música, podcasts e atividades em geral'],
  },

  privacy: {
    /** Atualize a data sempre que mudar o texto da política. */
    version: '2026-10-20',
    controller: 'Muquifo Homestudio',
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
  /** Equipamentos da sala disponíveis neste serviço. Vazio = não exibe a lista. */
  equipment: string[];
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
    // [CONFIRMAR] Confira os itens e complete com marcas/modelos.
    equipment: [
      'Bateria completa (com opção de aluguel de pratos)',
      'Amp de guitarra – Meteoro Nitrous 100g (100 W) 2x10',
      'Amp de guitarra – Meteoro Demolidor FWB-20 (20 W) 1x10',
      'Cubo de baixo – Voxstorm Cube Bass 125 (75 W) 1x12',
      'Mesa de som Behringer Xenyx 1202FX',
      'PA ativo Staner SR-315A (300 W RMS) + PA ativo Mark Audio 1200 (200 W RMS)',
      'Ar-condicionado, tratamento e isolamento acústico',
    ],
    fields: { projectLabel: 'Nome da banda ou projeto', askPeople: true, askDescription: false },
  },
  {
    id: 'gravacao',
    name: 'Gravação',
    verb: 'gravação',
    icon: Mic,
    summary: 'Horário reservado para registrar instrumentos, voz e ideias com a estrutura da sala.',
    audience: 'Para artistas, bandas e projetos compatíveis com a estrutura do estúdio.',
    // [CONFIRMAR] Cadastre os microfones (marca/modelo) e o restante do equipamento de gravação.
    equipment: [
      'Mesa de som Behringer Xenyx 1202FX',
      'Interface de áudio Behringer UM2 USB - 2 canais',
      '1x Microfone condensador Behringer B-1',
      '3x Microfone dinâmico Arcano A57',
      'Ar-condicionado, tratamento e isolamento acústico',
    ],
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
    // [CONFIRMAR] Confira os itens.
    equipment: [
      'Softbox, tripé e ring light para ensaios fotográficos',
      'Parede com fundo branco ou verde chroma key para ensaios fotográficos e gravações de vídeo',
      'Ar-condicionado, tratamento e isolamento acústico',
    ],
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
