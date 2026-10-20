# Muquifo Home Studio — site + agendamento

Landing page do estúdio com fluxo de pedido de agendamento (ensaio, gravação ou locação de sala), captura antecipada de leads e painel administrativo para pedidos e disponibilidade.

- **Site:** React 19 + TypeScript + Vite, Bootstrap 5 (só grid e utilitários) com CSS próprio, ícones Lucide.
- **Dados:** Cloud Firestore + Firebase Authentication (visitante anônimo e administrador por e-mail e senha). App Check opcional.
- **Hospedagem:** qualquer hospedagem estática de SPA. A configuração pronta é para o Firebase Hosting.

---

## 1. Rodar localmente

Requisitos: Node 20 ou superior.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Firebase (seção 3)
npm run dev                  # http://localhost:5173  ·  painel em /admin
```

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Checa os tipos e gera `dist/` para publicação |
| `npm run preview` | Serve o `dist/` localmente |
| `npm test` | Testes de unidade (regras de agenda, telefone, mensagem do WhatsApp) |
| `npm run test:rules` | Testes das regras de segurança no emulador (seção 7) |
| `npm run images` | Regera as imagens otimizadas a partir de `assets-src/` |

---

## 2. Como funciona

### Fluxo do visitante

1. **Contato** — nome e WhatsApp. Ao continuar, o **lead é gravado imediatamente** (`leads/{sessão}`, status `novo`). Nada é reservado.
2. **Modalidade** — ensaio, gravação ou locação de sala (podcast, ensaio fotográfico etc.). É **só informativa**, para você preparar a sala: a agenda e as regras de horário são as mesmas para todas. Se a pessoa veio do botão de uma modalidade, ela já vem marcada.
3. **Dia** — calendário em tempo real a partir do Firestore. Dias passados, fechados, lotados ou fora da janela não podem ser escolhidos.
4. **Horário** — uma linha do tempo mostra o dia (*livre*, *ocupado*, *em análise*, *indisponível*) e a lista dos períodos livres. A pessoa escolhe **a que horas começa** e **quantas horas quer** (ex.: 1h ou 5h seguidas), dentro da duração mínima e máxima configuradas e sem passar do fim do período livre.
5. **Detalhes** — todos opcionais, e variam por serviço.
6. **Revisão** — resumo com "alterar" em cada linha.
7. **Envio** — confere de novo no servidor se o horário segue livre, grava o pedido como `pedido_preparado` e abre `wa.me/5515998110938` com a mensagem pronta.

O progresso fica salvo no navegador por 7 dias: quem fecha a página e volta continua de onde parou, no mesmo lead.

### Interesse não é reserva

| Status | Significado | Ocupa a agenda? |
| --- | --- | --- |
| `novo` | Deixou nome e WhatsApp | Não |
| `em_andamento` | Escolhendo serviço, dia ou horário | Não |
| `pedido_preparado` | Clicou em "Enviar pelo WhatsApp" (não prova que enviou) | Não |
| `aguardando_confirmacao` | Você recebeu a mensagem e está analisando | Aparece como **"em análise"** no site |
| `confirmado` | Você confirmou | **Sim** |
| `recusado` / `cancelado` / `abandonado` | Encerrado | Não (libera o horário) |

Só o administrador muda o status a partir de `aguardando_confirmacao`. O site nunca diz que um horário está confirmado.

### Concorrência

- Pedidos de visitantes **não bloqueiam** horários: duas pessoas podem pedir o mesmo horário. As duas aparecem para você como pedidos.
- Antes de abrir o WhatsApp, o site relê a agenda **direto do servidor**. Se o horário foi ocupado ou bloqueado enquanto a pessoa preenchia, ela é avisada e volta para escolher outro.
- **Confirmar** roda numa **transação do Firestore**: relê o dia, verifica conflitos com reservas confirmadas (incluindo o tempo de preparação), bloqueios e dia fechado. Havendo conflito, a confirmação é recusada e o painel mostra o motivo. Assim, nunca existem duas reservas confirmadas sobrepostas.
- "Aguardando confirmação" funciona como retenção manual: o horário aparece como "em análise" até você confirmar ou liberar. Ele **não expira sozinho**, porque expiração automática exigiria Cloud Functions (plano Blaze). Se um pedido ficar parado, mude o status para liberar o horário.

### Disponibilidade (painel → Disponibilidade)

- **Semana:** dias e intervalos habituais. Um dia pode ter vários intervalos.
- **Regras de horário (um único configurador para qualquer modalidade):** duração mínima e máxima, de quanto em quanto andam inícios e durações (ex.: 60 min → 18h, 19h… e 1h, 2h…) e tempo de preparação entre reservas. Também a antecedência mínima e quantos dias à frente a agenda fica aberta. Nenhuma reserva ultrapassa o fim do expediente. Há uma prévia do que o site vai oferecer.
- **Sala única:** reservas confirmadas, pedidos em análise e bloqueios ocupam o período para qualquer pessoa, seja qual for a modalidade. Uma locação confirmada das 14h às 17h deixa esse período indisponível para todos.
- **Datas e bloqueios:** em cada data dá para seguir a semana (com intervalos extras), usar um horário especial ou fechar o dia, além de criar bloqueios de período (uso pessoal, manutenção, compromisso) e reabri-los. Também é possível fechar ou restaurar vários dias de uma vez. **As exceções da data sempre prevalecem sobre a semana.**

Enquanto você não clicar em **"Publicar agenda"** pela primeira vez, o site mostra "agenda ainda não aberta" com o botão de WhatsApp. Não existe nenhuma disponibilidade fixa no código.

---

## 3. Configurar o Firebase (uma vez)

O projeto `muquifo-40ff5` já existe e o `.firebaserc` aponta para ele. Falta:

1. **Firestore:** Console → *Build → Firestore Database → Criar banco*. Modo **produção**, região `southamerica-east1` (São Paulo).
2. **Authentication:** *Build → Authentication → Sign-in method*. Ative:
   - **E-mail/senha** (para o administrador);
   - **Anônimo** (sessão invisível do visitante; é o que garante que cada navegador só altera o próprio lead).
3. **Bloquear cadastro público:** em *Authentication → Settings → User actions*, **desmarque "Enable create (sign-up)"**. Assim ninguém cria conta de e-mail/senha pelo site. O painel não tem cadastro de qualquer forma.
4. **Variáveis:** *Configurações do projeto → Geral → Seus apps → app Web*. Copie os valores para `.env.local` (modelo em `.env.example`). Esses valores não são segredo, mas `.env.local` fica fora do Git.
5. **Domínios autorizados:** *Authentication → Settings → Authorized domains*. Inclua o domínio onde o site vai rodar (o `*.web.app` já vem incluído).
6. **Publicar regras e índices** (com o [Firebase CLI](https://firebase.google.com/docs/cli)):
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

### Criar o primeiro administrador (processo controlado)

1. *Authentication → Users → Add user*. Cadastre seu e-mail e uma senha forte.
2. Copie o **User UID** da lista.
3. *Firestore → Iniciar coleção* `admins` → ID do documento = **o UID copiado** → um campo qualquer, por exemplo `email: "seu@email"`.
4. Entre em `/admin`.

As regras impedem qualquer escrita em `admins` pelo app: só o Console (ou o Admin SDK) cria administradores. Alternativa por custom claim: `scripts/set-admin-claim.mjs`, com instruções no próprio arquivo.

### App Check (recomendado em produção)

1. Crie uma chave **reCAPTCHA Enterprise** para o domínio do site (Console do Google Cloud → Security → reCAPTCHA).
2. Firebase → *App Check → Apps* → registre o app Web com essa chave.
3. Coloque a chave em `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`, faça o build e publique.
4. Acompanhe as métricas por alguns dias e depois clique em **Enforce** para o Firestore e o Authentication.

---

## 4. Publicar

```bash
npm run build
npx firebase-tools deploy --only hosting
```

O `firebase.json` já tem o *rewrite* de SPA (`/admin` e `/privacidade` funcionam ao recarregar a página), cache longo para `/assets`, `noindex` no painel e cabeçalhos básicos de segurança.

Outras hospedagens: `public/_redirects` cobre Netlify e Cloudflare Pages. Em qualquer outra, configure "todas as rotas → `/index.html`". Defina `VITE_SITE_URL` com o endereço final para as prévias de compartilhamento (Open Graph).

---

## 5. Editar conteúdo

Tudo fica em **`src/config/studio.ts`**: textos do hero e do "sobre", cidade, equipamentos, diferenciais, tipos de trabalho, WhatsApp e serviços (ensaio, gravação e locação de sala). Itens marcados com `[CONFIRMAR]` são provisórios. Listas vazias simplesmente não aparecem no site.

- **Novo serviço:** adicione em `services` (`studio.ts`), em `ServiceType` e `SERVICE_TYPES` (`src/types`), nas regras (`validService` em `firestore.rules`) (a agenda não muda: a modalidade é só informativa).
- **Fotos:** troque os arquivos em `assets-src/` e rode `npm run images`.
- **Política de privacidade:** `src/pages/PrivacyPage.tsx`. Ao mudar o texto, atualize `privacy.version` em `studio.ts`, porque cada lead grava a versão que viu.

---

## 6. Modelo de dados

| Coleção | Conteúdo | Leitura | Escrita |
| --- | --- | --- | --- |
| `leads/{id}` | nome, WhatsApp (formatado e normalizado `55DDDNÚMERO`), status, etapa, serviço, ref. do pedido, versão do aviso de privacidade, `ownerUid` | admin | visitante cria e avança o próprio; admin muda status e anotações |
| `bookingRequests/{id}` | mesmo id do lead; serviço, data `YYYY-MM-DD`, início e fim `HH:MM`, detalhes, status, anotações | admin | visitante cria e reenvia enquanto está `pedido_preparado`; admin muda status e anotações |
| `settings/availability` | semana, regras por serviço, antecedência, janela, fuso | pública | admin |
| `calendarDays/{YYYY-MM-DD}` | exceções da data (modo, intervalos, extras, bloqueios) e ocupação (`booked`, `holds`) **sem dados pessoais** | pública | admin |
| `admins/{uid}` | quem é administrador | o próprio | ninguém pelo app |
| `visitorThrottle/{uid}` | horário do último lead e do último pedido do visitante (limite de frequência) | admin | o próprio, com intervalo mínimo |

**Datas e fuso:** datas de calendário são strings locais `YYYY-MM-DD` e horários são `HH:MM` no fuso `America/Sao_Paulo`. "Hoje" e "agora" são sempre calculados nesse fuso (`src/utils/datetime.ts`), então um aparelho em outro fuso não desloca o dia. Carimbos de criação e atualização usam `serverTimestamp()`.

**Índices:** as consultas usam só índices automáticos de campo único. O arquivo `firestore.indexes.json` está vazio de propósito.

---

## 7. Segurança e privacidade

- Visitantes **não leem** leads nem pedidos (nem os próprios). Só criam e atualizam os seus, e apenas nos campos permitidos, sem poder mexer em status administrativo.
- Todos os campos são validados nas regras: tamanho, formato do telefone, data, horário e serviço.
- **Limite de frequência:** cada sessão de visitante cria no máximo um lead a cada 20 s e um pedido a cada 15 s. Somado ao limite de criação de usuários anônimos do Firebase e ao App Check, isso contém spam básico.
- Nenhuma credencial administrativa fica no front-end. A proteção está nas regras, não no React.
- O telefone do cliente nunca vai para URL pública. Só aparece no link `wa.me` que o próprio administrador abre.
- **LGPD:** o site coleta o mínimo (nome e WhatsApp), informa a finalidade com link para `/privacidade` e não usa os dados para marketing. No painel é possível excluir lead e pedido de uma pessoa. Defina e cumpra o prazo de guarda (`privacy.retention` em `studio.ts`, provisório: 12 meses).

**Testar as regras** (requer Java 11+ para o emulador):

```bash
npm run test:rules        # ou: npx firebase-tools emulators:exec --only firestore --project demo-muquifo "npx vitest run -c vitest.rules.config.ts"
```

Para desenvolver sem tocar no projeto real: `npx firebase-tools emulators:start --project demo-muquifo` e `VITE_USE_FIREBASE_EMULATORS=true` no `.env.local`.

---

## 8. Estrutura

```
src/
  config/        studio.ts (conteúdo), photos.ts, status.ts, valores de exemplo da agenda
  types/         tipos do domínio
  utils/         datetime (fuso), slots (motor de disponibilidade), phone, whatsapp, text
  services/      firebase/ (init, auth, erros), leads, bookings, availability
  hooks/         useAvailability, useBookingDraft, useModal
  components/
    ui/          Button, Field, Alert, EmptyState, ConfirmDialog, Toast, StatusBadge, Picture
    layout/      Header, Footer, MobileCta
    landing/     Hero, About, Services, Gallery, BookingSection
    booking/     BookingWizard + uma etapa por arquivo
    calendar/    MonthCalendar (site e painel)
    admin/       painel (carregado sob demanda, com CSS próprio)
  pages/         Landing, Privacidade, 404
firestore.rules  regras de segurança
tests/rules/     testes das regras (emulador)
```

O motor de disponibilidade (`src/utils/slots.ts`) é a **única** fonte das regras de horários e é usado pelo site, pela prévia do painel e pela transação de confirmação.

**Performance:** a primeira dobra carrega só React, a landing e o CSS (cerca de 90 KB gzip). O SDK do Firebase e o fluxo de agendamento são baixados quando a seção de agendamento se aproxima da tela ou quando alguém clica em "Agendar". O painel é um pacote separado. As fotos são WebP responsivas com fallback JPEG e dimensões explícitas.
