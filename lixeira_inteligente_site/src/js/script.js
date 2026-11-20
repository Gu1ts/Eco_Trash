// Endereço do Firebase Realtime Database
const FIREBASE_URL =
  "https://guilhermebanco-default-rtdb.firebaseio.com/leituras.json";

// Busca registros e exibe somente a medição mais recente
async function atualizarPainel() {
  const textoConexao = document.getElementById("texto-conexao");
  const pontoConexao = document.getElementById("ponto-conexao");

  try {
    const resposta = await fetch(FIREBASE_URL);
    if (!resposta.ok) throw new Error("Não foi possível acessar o Firebase.");
    const dados = await resposta.json();
    if (!dados) throw new Error("Ainda não existem medições no banco.");

    // Transforma os registros recebidos em lista e ordena pela data
    const leituras = Object.values(dados);
    leituras.sort((a, b) => converterData(b.data_hora) - converterData(a.data_hora));
    const ultimaLeitura = leituras[0];

    // Confere se a leitura contém os campos necessários
    if (!ultimaLeitura || ultimaLeitura.ocupacao === undefined || !ultimaLeitura.data_hora) {
      throw new Error("Os dados da última medição estão incompletos.");
    }

    // Atualiza o percentual exibido
    const percentual = Number(ultimaLeitura.ocupacao);
    document.getElementById("ocupacao").textContent = percentual.toFixed(1).replace(".", ",") + "%";

    // Atualiza texto e cor do status
    const statusElemento = document.getElementById("status");
    const status = String(ultimaLeitura.status || "INDEFINIDO").toUpperCase();
    statusElemento.textContent = status;
    statusElemento.className = "status";
    if (status === "AMARELO") statusElemento.classList.add("amarelo");
    else if (status === "VERMELHO") statusElemento.classList.add("vermelho");

    // Mostra data e hora da última leitura
    document.getElementById("ultima-medicao").textContent = formatarData(ultimaLeitura.data_hora);

    // Indica conexão bem-sucedida
    pontoConexao.className = "ponto online";
    textoConexao.textContent = "Conectado ao Firebase";
  } catch (erro) {
    // Indica erro de conexão ou ausência de dados
    pontoConexao.className = "ponto erro";
    textoConexao.textContent = erro.message;
  }
}

// Converte a data armazenada para um formato que o navegador entende
function converterData(valor) {
  if (!valor) return 0;
  return new Date(String(valor).replace(" ", "T")).getTime() || 0;
}

// Formata data e hora para o padrão brasileiro
function formatarData(valor) {
  const data = new Date(String(valor).replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

// Faz uma consulta ao abrir e atualiza automaticamente a cada 3 segundos
atualizarPainel();
setInterval(atualizarPainel, 3000);
