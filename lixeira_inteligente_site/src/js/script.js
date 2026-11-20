// EcoTrash: consulta manual do último registro do Firebase.
// Após uma consulta, bloqueia o botão por 20 segundos para evitar excesso de requisições.

const FIREBASE_URL = "https://guilhermebanco-default-rtdb.firebaseio.com/leituras.json";
const INTERVALO_CONSULTA = 20;

const queryButton = document.getElementById("queryButton");
const countdownText = document.getElementById("countdownText");
const connectionBadge = document.getElementById("connectionBadge");

let consultaBloqueada = false;
let contadorInterval = null;

function definirBadge(texto, classe) {
  connectionBadge.textContent = texto;
  connectionBadge.className = `badge ${classe}`;
}

function formatarDataHora(valor) {
  if (!valor) return "--";
  // Compatível com formato "YYYY-MM-DD HH:mm:ss" enviado pela ESP32.
  const data = new Date(valor.replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR");
}

function atualizarInterface(dado) {
  const ocupacao = Number(dado.ocupacao);
  const distancia = Number(dado.distancia);
  const status = String(dado.status || "DESCONHECIDO").toUpperCase();

  document.getElementById("occupancyValue").textContent =
    Number.isFinite(ocupacao) ? ocupacao.toFixed(1) : "--";
  document.getElementById("distanceValue").textContent =
    Number.isFinite(distancia) ? `${distancia.toFixed(2)} cm` : "--";
  document.getElementById("readingTime").textContent =
    formatarDataHora(dado.data_hora);
  document.getElementById("deviceValue").textContent =
    dado.dispositivo || "ESP32_LIXEIRA";
  document.getElementById("statusValue").textContent = status;

  const indicator = document.getElementById("statusIndicator");
  const fill = document.getElementById("progressFill");
  indicator.className = "status-indicator";
  fill.style.width = `${Math.max(0, Math.min(100, ocupacao || 0))}%`;

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
  document.getElementById("statusDescription").textContent = descricao;
}

function iniciarBloqueio() {
  consultaBloqueada = true;
  queryButton.disabled = true;
  let restante = INTERVALO_CONSULTA;
  countdownText.textContent = `Próxima consulta disponível em ${restante} segundos.`;

  if (contadorInterval) clearInterval(contadorInterval);
  contadorInterval = setInterval(() => {
    restante -= 1;
    if (restante <= 0) {
      clearInterval(contadorInterval);
      contadorInterval = null;
      consultaBloqueada = false;
      queryButton.disabled = false;
      countdownText.textContent = "Consulta liberada. Clique para atualizar os dados.";
      return;
    }
    countdownText.textContent = `Próxima consulta disponível em ${restante} segundos.`;
  }, 1000);
}

async function consultarFirebase() {
  if (consultaBloqueada) return;

  queryButton.disabled = true;
  queryButton.textContent = "Consultando...";
  definirBadge("Consultando Firebase", "neutral");

  try {
    // GET único: busca o histórico e seleciona o registro mais recente.
    const resposta = await fetch(FIREBASE_URL, { cache: "no-store" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const registros = await resposta.json();
    if (!registros || typeof registros !== "object") {
      throw new Error("Banco sem registros.");
    }

    const lista = Object.values(registros);
    if (!lista.length) throw new Error("Nenhuma leitura encontrada.");

    // Usa timestamp, se existir; senão, tenta data_hora.
    lista.sort((a, b) => {
      const ta = Number(a.timestamp) || Date.parse((a.data_hora || "").replace(" ", "T")) || 0;
      const tb = Number(b.timestamp) || Date.parse((b.data_hora || "").replace(" ", "T")) || 0;
      return ta - tb;
    });

    const ultimo = lista[lista.length - 1];
    atualizarInterface(ultimo);
    definirBadge("Dados atualizados", "success");
    countdownText.textContent = "Consulta concluída. Intervalo de 20 segundos iniciado.";
  } catch (erro) {
    console.error("EcoTrash consulta:", erro);
    definirBadge("Falha na consulta", "error");
    countdownText.textContent = "Não foi possível consultar o Firebase. Tente novamente após o intervalo.";
  } finally {
    queryButton.textContent = "↻  Consultar banco";
    iniciarBloqueio();
  }
}

queryButton.addEventListener("click", consultarFirebase);
