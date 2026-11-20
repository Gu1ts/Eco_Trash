
/* ==========================================
   ECOTRASH - CONSULTA MANUAL FIREBASE
   Intervalo de 20 segundos entre consultas
   Horario convertido para Fortaleza
========================================== */

const FIREBASE_URL =
  "https://guilhermebanco-default-rtdb.firebaseio.com/leituras.json";

const INTERVALO_CONSULTA = 20;

const FUSO_HORARIO = "America/Fortaleza";

const queryButton = document.getElementById("queryButton");
const countdownText = document.getElementById("countdownText");
const connectionBadge = document.getElementById("connectionBadge");

let consultaBloqueada = false;
let contadorInterval = null;


/* ==========================================
   BADGE DE CONEXAO
========================================== */

function definirBadge(texto, classe) {
  connectionBadge.textContent = texto;
  connectionBadge.className = `badge ${classe}`;
}


/* ==========================================
   FORMATAR DATA E HORA

   Compatível com:
   1. Timestamp Firebase em milissegundos
   2. Data antiga no formato YYYY-MM-DD HH:mm:ss
========================================== */

function formatarDataHora(valor) {

  if (valor === null || valor === undefined || valor === "") {
    return "--";
  }

  let data;

  // Firebase Server Timestamp em milissegundos
  if (typeof valor === "number" || !isNaN(Number(valor))) {

    const timestamp = Number(valor);

    // Evita interpretar valores inválidos como data
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return "--";
    }

    data = new Date(timestamp);

  } else if (typeof valor === "string") {

    // Compatibilidade com registros antigos
    const texto = valor.trim();

    // Formato antigo: YYYY-MM-DD HH:mm:ss
    const formatoAntigo =
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;

    const match = texto.match(formatoAntigo);

    if (match) {

      // Data antiga é tratada como horário de Fortaleza
      data = new Date(
        `${match[1]}-${match[2]}-${match[3]}T` +
        `${match[4]}:${match[5]}:${match[6]}-03:00`
      );

    } else {

      // Tenta interpretar outros formatos de data
      data = new Date(texto);
    }

  } else {

    return "--";
  }

  if (Number.isNaN(data.getTime())) {
    return "--";
  }

  return data.toLocaleString("pt-BR", {
    timeZone: FUSO_HORARIO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}


/* ==========================================
   CONVERTER DATA PARA ORDENACAO

   Retorna o timestamp em milissegundos.
========================================== */

function obterTimestamp(registro) {

  if (!registro) {
    return 0;
  }

  // Novo padrão: data_hora numérica do Firebase
  if (
    typeof registro.data_hora === "number" &&
    Number.isFinite(registro.data_hora)
  ) {
    return registro.data_hora;
  }

  // Compatibilidade com campo timestamp separado
  if (
    registro.timestamp !== undefined &&
    registro.timestamp !== null
  ) {

    const timestamp = Number(registro.timestamp);

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  // Compatibilidade com formato antigo de data
  if (typeof registro.data_hora === "string") {

    const texto = registro.data_hora.trim();

    const formatoAntigo =
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;

    const match = texto.match(formatoAntigo);

    if (match) {

      const data = new Date(
        `${match[1]}-${match[2]}-${match[3]}T` +
        `${match[4]}:${match[5]}:${match[6]}-03:00`
      );

      return Number.isNaN(data.getTime())
        ? 0
        : data.getTime();
    }

    const data = new Date(texto);

    if (!Number.isNaN(data.getTime())) {
      return data.getTime();
    }
  }

  return 0;
}


/* ==========================================
   ATUALIZAR INTERFACE
========================================== */

function atualizarInterface(dado) {

  const ocupacao = Number(dado.ocupacao);
  const distancia = Number(dado.distancia);

  const status = String(
    dado.status || "DESCONHECIDO"
  ).toUpperCase();

  // Ocupacao
  document.getElementById("occupancyValue").textContent =
    Number.isFinite(ocupacao)
      ? ocupacao.toFixed(1)
      : "--";

  // Distancia
  document.getElementById("distanceValue").textContent =
    Number.isFinite(distancia)
      ? `${distancia.toFixed(2)} cm`
      : "--";

  // Data e hora
  document.getElementById("readingTime").textContent =
    formatarDataHora(dado.data_hora);

  // Dispositivo
  document.getElementById("deviceValue").textContent =
    dado.dispositivo || "ESP32_LIXEIRA";

  // Status
  document.getElementById("statusValue").textContent =
    status;

  const indicator =
    document.getElementById("statusIndicator");

  const fill =
    document.getElementById("progressFill");

  indicator.className = "status-indicator";

  const percentualValido = Number.isFinite(ocupacao)
    ? Math.max(0, Math.min(100, ocupacao))
    : 0;

  fill.style.width = `${percentualValido}%`;

  let classe = "green";
  let cor = "var(--green)";
  let descricao = "Nível de ocupação baixo.";

  if (status.includes("AMARELO")) {

    classe = "yellow";
    cor = "var(--yellow)";
    descricao = "A lixeira está parcialmente ocupada.";

  } else if (status.includes("VERMELHO")) {

    classe = "red";
    cor = "var(--red)";
    descricao = "A lixeira está com nível de ocupação elevado.";

  } else if (!status.includes("VERDE")) {

    descricao = "Status recebido do dispositivo.";
  }

  indicator.classList.add(classe);

  fill.style.background = cor;

  document.getElementById("statusDescription").textContent =
    descricao;
}


/* ==========================================
   BLOQUEIO DE CONSULTA - 20 SEGUNDOS
========================================== */

function iniciarBloqueio() {

  consultaBloqueada = true;

  queryButton.disabled = true;

  let restante = INTERVALO_CONSULTA;

  countdownText.textContent =
    `Próxima consulta disponível em ${restante} segundos.`;

  if (contadorInterval) {
    clearInterval(contadorInterval);
  }

  contadorInterval = setInterval(() => {

    restante--;

    if (restante <= 0) {

      clearInterval(contadorInterval);

      contadorInterval = null;

      consultaBloqueada = false;

      queryButton.disabled = false;

      countdownText.textContent =
        "Consulta liberada. Clique para atualizar os dados.";

      return;
    }

    countdownText.textContent =
      `Próxima consulta disponível em ${restante} segundos.`;

  }, 1000);
}


/* ==========================================
   CONSULTAR FIREBASE
========================================== */

async function consultarFirebase() {

  if (consultaBloqueada) {
    return;
  }

  queryButton.disabled = true;

  queryButton.textContent = "Consultando...";

  definirBadge("Consultando Firebase", "neutral");

  try {

    // Consulta o Firebase
    const resposta = await fetch(FIREBASE_URL, {
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const registros = await resposta.json();

    if (
      !registros ||
      typeof registros !== "object"
    ) {
      throw new Error("Banco sem registros.");
    }

    // Transforma os registros em lista
    const lista = Object.values(registros);

    if (!lista.length) {
      throw new Error("Nenhuma leitura encontrada.");
    }

    // Ordena do mais antigo para o mais recente
    lista.sort((a, b) => {
      return obterTimestamp(a) - obterTimestamp(b);
    });

    // Seleciona o registro mais recente
    const ultimo = lista[lista.length - 1];

    console.log("[EcoTrash] Último registro:", ultimo);

    console.log(
      "[EcoTrash] Timestamp:",
      obterTimestamp(ultimo)
    );

    // Atualiza a interface
    atualizarInterface(ultimo);

    definirBadge("Dados atualizados", "success");

    countdownText.textContent =
      "Consulta concluída. Intervalo de 20 segundos iniciado.";

  } catch (erro) {

    console.error("EcoTrash consulta:", erro);

    definirBadge("Falha na consulta", "error");

    countdownText.textContent =
      "Não foi possível consultar o Firebase.";

  } finally {

    queryButton.textContent = "↻ Consultar banco";

    iniciarBloqueio();
  }
}


/* ==========================================
   EVENTO DO BOTAO
========================================== */

queryButton.addEventListener(
  "click",
  consultarFirebase
);

