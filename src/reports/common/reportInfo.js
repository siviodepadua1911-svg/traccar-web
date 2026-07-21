// Textos simples (pt-BR) usados na legenda do menu de Relatórios e no
// cartão explicativo de cada relatório. Central pra não duplicar frase em
// vários arquivos.
const REPORT_INFO = {
  combined: {
    menuCaption: 'viagens e paradas juntas, com o trajeto no mapa',
    whatShows: 'Viagens e paradas do período, numa lista só, na ordem que aconteceram.',
    whatFor: 'Ter uma visão geral do dia do veículo sem trocar de relatório.',
    whatCanDo: 'Clicar num item da lista pra ver o trajeto daquele trecho no mapa.',
  },
  events: {
    menuCaption: 'alarmes e avisos que aconteceram',
    whatShows: 'Cada alarme, aviso ou resposta de comando registrado no período.',
    whatFor:
      'Conferir o que aconteceu com o veículo: ignição, cerca, excesso de velocidade e mais.',
    whatCanDo: 'Filtrar por tipo de alerta e exportar a lista em planilha.',
  },
  geofences: {
    menuCaption: 'quando o veículo entrou ou saiu de uma cerca',
    whatShows: 'Toda entrada e saída de cerca eletrônica no período escolhido.',
    whatFor: 'Confirmar se o veículo passou (ou não) por um local específico.',
    whatCanDo: 'Filtrar por cerca e exportar a lista.',
  },
  trips: {
    menuCaption: 'de onde saiu, onde chegou, km e tempo',
    whatShows: 'Cada viagem do período: início, fim, distância, velocidade e duração.',
    whatFor: 'Saber pra onde o veículo foi e quanto tempo levou.',
    whatCanDo: 'Clicar numa viagem pra ver o trajeto no mapa, ou abrir direto na Reprodução.',
  },
  stops: {
    menuCaption: 'onde e por quanto tempo o veículo ficou parado',
    whatShows: 'Cada parada do período: local, hora de início e quanto tempo durou.',
    whatFor: 'Descobrir onde o veículo ficou parado, e por quanto tempo.',
    whatCanDo: 'Clicar numa parada pra ver o local exato no mapa.',
  },
  summary: {
    menuCaption: 'total de km, horas rodadas e paradas por dia',
    whatShows: 'Um resumo por veículo (ou por dia): km rodado, tempo em movimento e parado.',
    whatFor: 'Ter o total do período sem precisar contar viagem por viagem.',
    whatCanDo: 'Comparar dias ou veículos diferentes lado a lado.',
  },
  chart: {
    menuCaption: 'velocidade, combustível ou outro dado num gráfico',
    whatShows: 'Um valor (velocidade, combustível, altitude...) ao longo do tempo, em gráfico.',
    whatFor: 'Visualizar como um dado variou durante o período.',
    whatCanDo: 'Escolher qual dado ver e passar o mouse pra ver o valor exato num ponto.',
  },
  replay: {
    menuCaption: 'assistir o trajeto no mapa',
    whatShows: 'O caminho que o veículo fez, ponto a ponto, animado no mapa.',
    whatFor: 'Ver visualmente por onde o veículo passou, como se fosse um vídeo.',
    whatCanDo: 'Dar play, pausar, acelerar e arrastar pra qualquer momento do trajeto.',
  },
  positions: {
    menuCaption: 'lista de cada ponto que o veículo mandou',
    whatShows: 'Cada posição bruta enviada pelo rastreador no período (local, velocidade, hora).',
    whatFor: 'Conferir o dado técnico exato de cada ponto, sem interpretação.',
    whatCanDo: 'Exportar a lista completa em planilha (CSV, GPX, KML).',
  },
  logs: {
    menuCaption: 'registro técnico bruto, uso avançado',
    whatShows: 'O tráfego bruto entre o rastreador e o servidor.',
    whatFor: 'Investigar um problema técnico de comunicação com o aparelho.',
    whatCanDo: 'Normalmente só é usado com ajuda do suporte técnico.',
  },
  scheduled: {
    menuCaption: 'receber por e-mail automático',
    whatShows: 'A lista de relatórios que já estão programados pra rodar sozinhos.',
    whatFor: 'Receber um relatório pronto por e-mail sem precisar entrar no sistema.',
    whatCanDo:
      'Criar um agendamento a partir de qualquer relatório (botão de calendário), ou apagar um daqui.',
  },
  statistics: {
    menuCaption: 'números gerais de uso da plataforma',
    whatShows: 'Estatísticas gerais do servidor: mensagens recebidas, usuários ativos e mais.',
    whatFor: 'Acompanhar a saúde geral da plataforma (uso administrativo).',
    whatCanDo: 'Ver o histórico dia a dia.',
  },
  audit: {
    menuCaption: 'histórico de ações administrativas',
    whatShows: 'Registro de mudanças feitas por administradores no sistema.',
    whatFor: 'Rastrear quem alterou o quê (uso administrativo).',
    whatCanDo: 'Filtrar por período.',
  },
};

export default REPORT_INFO;
