// app.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Caminho do arquivo de dados
const DATA_FILE = path.join(__dirname, 'saida.json');
let saidas = [];

// Função para fazer commit e push no GitHub
const { exec } = require('child_process');
const path = require('path');

function commitToGit() {
  const projectPath = path.join(__dirname);
  const gitUser = process.env.GIT_USER;
  const gitEmail = process.env.GIT_EMAIL;
  const gitToken = process.env.GIT_TOKEN;
  const repoUrl = `https://${gitUser}:${gitToken}@github.com/iagom63/AlmoxarifadoSmart2.0.git`;

  exec(
    `
    git config --global user.name "${gitUser}" &&
    git config --global user.email "${gitEmail}" &&
    git -C ${projectPath} add saida.json &&
    git -C ${projectPath} commit -m "Backup automático via Render" &&
    git -C ${projectPath} push ${repoUrl} main
    `,
    (err, stdout, stderr) => {
      if (err) {
        console.error('Erro ao fazer commit:', stderr);
      } else {
        console.log('Backup realizado no GitHub:', stdout);
      }
    }
  );
}

// Carrega os registros do JSON
function loadSaidas() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      saidas = JSON.parse(raw);
    } else {
      saidas = [];
    }
  } catch (err) {
    console.error('Erro ao ler saida.json:', err);
    saidas = [];
  }
}

// Salva os registros no JSON
function saveSaidas() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(saidas, null, 2), 'utf8');
    commitToGit();
  } catch (err) {
    console.error('Erro ao salvar saida.json:', err);
  }
}

// Inicialização
loadSaidas();

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
  res.redirect('/solicitacao.html');
});

// Processa envio de itens
app.post('/itens', (req, res) => {
  const { solicitante, destino, autorizado, count } = req.body;
  const n = parseInt(count, 10) || 0;

  for (let i = 0; i < n; i++) {
    const item = {
      nome: solicitante,
      observacao: destino,
      responsavel: autorizado,
      tipo: req.body[`tipo_${i}`],
      descricao: req.body[`descricao_${i}`],
      quantidade: req.body[`quantidade_${i}`],
      unidade: req.body[`unidade_${i}`],
      delivered: false,
      timestamp: Date.now()
    };
    saidas.push(item);
  }

  saveSaidas();
  io.emit('update');
  res.redirect('/solicitacao.html');
});

// API para obter os registros
app.get('/api/saidas', (req, res) => {
  res.json(saidas);
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
