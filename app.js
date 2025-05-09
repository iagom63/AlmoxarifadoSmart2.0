// app.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ExcelJS = require('exceljs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Caminhos dos arquivos de dados
const DATA_FILE = path.join(__dirname, 'saida.json');
const RELATORIO_FILE = path.join(__dirname, 'relatorio.json');
let saidas = [];

// Função para fazer commit e push no GitHub
function commitToGit() {
  const projectPath = path.join(__dirname);
  const gitUser = process.env.GIT_USER;
  const gitEmail = process.env.GIT_EMAIL;
  const gitToken = process.env.GIT_TOKEN;
  const repoUrl = `https://${gitToken}@github.com/iagom63/AlmoxarifadoSmart2.0.git`;

  exec(
    `
    git config --global user.name "${gitUser}" &&
    git config --global user.email "${gitEmail}" &&
    git -C ${projectPath} checkout main &&
    git -C ${projectPath} add saida.json relatorio.json &&
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

// Carrega os registros do relatório
function loadRelatorio() {
  try {
    if (fs.existsSync(RELATORIO_FILE)) {
      const raw = fs.readFileSync(RELATORIO_FILE, 'utf8');
      return JSON.parse(raw);
    } else {
      return [];
    }
  } catch (err) {
    console.error('Erro ao ler relatorio.json:', err);
    return [];
  }
}

// Salva os registros no relatório
function saveRelatorio(data) {
  try {
    const relatorio = loadRelatorio();
    relatorio.push(...data);
    fs.writeFileSync(RELATORIO_FILE, JSON.stringify(relatorio, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar relatorio.json:', err);
  }
}

// Salva os registros no JSON e no relatório
function saveSaidas() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(saidas, null, 2), 'utf8');
    saveRelatorio(saidas);  // Salva também no relatório
    commitToGit();          // Realiza o backup no GitHub
  } catch (err) {
    console.error('Erro ao salvar saida.json:', err);
  }
}

// Inicialização
loadSaidas();

// Middlewares para parse de corpo
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal: redireciona ao formulário
app.get('/', (req, res) => {
  res.redirect('/solicitacao.html');
});

// Processa envio do formulário de Itens
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

// API para obter JSON de saídas
app.get('/api/saidas', (req, res) => {
  res.json(saidas);
});

// Rota para exportar o relatório em Excel
app.get('/exportar-relatorio', async (req, res) => {
  const relatorio = loadRelatorio();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Relatório');

  ws.columns = [
    { header: 'Nome', key: 'nome', width: 30 },
    { header: 'Local', key: 'observacao', width: 30 },
    { header: 'Autorizado Por', key: 'responsavel', width: 30 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Descrição', key: 'descricao', width: 30 },
    { header: 'Qtd', key: 'quantidade', width: 10 },
    { header: 'Unidade', key: 'unidade', width: 10 },
    { header: 'Entregue', key: 'delivered', width: 10 },
    { header: 'Timestamp', key: 'timestamp', width: 25 }
  ];

  ws.addRows(relatorio);

  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=relatorio.xlsx');

  await wb.xlsx.write(res);
  res.end();
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
