
// ECOTRASH - CONSULTA FIREBASE

const FIREBASE_URL = "https://guilhermebanco-default-rtdb.firebaseio.com/leituras.json";
const INTERVALO = 20;

const queryButton = document.getElementById("queryButton");
const countdownText = document.getElementById("countdownText");
const connectionBadge = document.getElementById("connectionBadge");

let bloqueado = false;
let contador;


// Atualiza o indicador de conexão
function definirBadge(texto, classe) {
  connectionBadge.textContent = texto;
  connectionBadge.className = `badge ${classe}`;
}


// Converte o timestamp do Firebase para horário de Fortaleza
function formatarData(timestamp) {
  if (!timestamp) return "--";

  return new Date(Number(timestamp)).toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza"
  });
}


// Atualiza os dados da tela
function atualizarTela(dado) {
  const ocupacao = Number(dado.ocupacao);
  const distancia = Number(dado.distancia);
  const status = dado.status || "DESCONHECIDO";

  document.getElementById("occupancyValue").textContent =
    ocupacao.toFixed(1);

  document.getElementById("distanceValue").textContent =
    distancia.toFixed(2) + " cm";

  document.getElementById("readingTime").textContent =
    formatarData(dado.data_hora);

  document.getElementById("deviceValue").textContent =
    dado.dispositivo || "ESP32_LIXEIRA";

  document.getElementById("statusValue").textContent = status;

  const indicador = document.getElementById("statusIndicator");
  const barra = document.getElementById("progressFill");

  barra.style.width = `${ocupacao}%`;

  indicador.className = "status-indicator";

  let classe = "green";
  let cor = "var(--green)";
  let descricao = "Nível de ocupação baixo.";

  if (status === "AMARELO") {
    classe = "yellow";
    cor = "var(--yellow)";
    descricao = "A lixeira está parcialmente ocupada.";
  }

  if (status === "VERMELHO") {
    classe = "red";
    cor = "var(--red)";
    descricao = "A lixeira está com nível elevado.";
  }

  indicador.classList.add(classe);
  barra.style.background = cor;

  document.getElementById("statusDescription").textContent =
    descricao;
}


// Bloqueia o botão por 20 segundos
function iniciarBloqueio() {
  bloqueado = true;
  queryButton.disabled = true;

  let restante = INTERVALO;

  countdownText.textContent =
    `Próxima consulta em ${restante} segundos.`;

  clearInterval(contador);

  contador = setInterval(() => {
    restante--;

    countdownText.textContent =
      `Próxima consulta em ${restante} segundos.`;

    if (restante <= 0) {
      clearInterval(contador);
      bloqueado = false;
      queryButton.disabled = false;
      countdownText.textContent = "Consulta liberada.";
    }
  }, 1000);
}


// Consulta os dados do Firebase
async function consultarFirebase() {
  if (bloqueado) return;

  queryButton.disabled = true;
  queryButton.textContent = "Consultando...";
  definirBadge("Consultando", "neutral");

  try {
    const resposta = await fetch(FIREBASE_URL);

    if (!resposta.ok) {
      throw new Error("Falha na conexão com Firebase");
    }

    const registros = await resposta.json();

    if (!registros) {
      throw new Error("Nenhum registro encontrado");
    }

    // Seleciona o registro com o maior timestamp
    const lista = Object.values(registros);

    const ultimo = lista.reduce((maisRecente, atual) =>
      Number(atual.data_hora) > Number(maisRecente.data_hora)
        ? atual
        : maisRecente
    );

    atualizarTela(ultimo);

    definirBadge("Dados atualizados", "success");

  } catch (erro) {
    console.error(erro);
    definirBadge("Falha na consulta", "error");
    countdownText.textContent = "Erro ao consultar os dados.";
  }

  queryButton.textContent = "↻ Consultar banco";
  iniciarBloqueio();
}


// Evento do botão
queryButton.addEventListener("click", consultarFirebase);

