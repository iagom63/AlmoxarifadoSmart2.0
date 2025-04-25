// app.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Caminho do arquivo de dados
const DATA_FILE = path.join(__dirname, 'saida.json');
let saidas = [];

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
  } catch (err) {
    console.error('Erro ao salvar saida.json:', err);
  }
}

// Inicialização
loadSaidas();

// Middlewares para parse de corpo
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve arquivos estáticos de /public
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
      nome:        solicitante,
      observacao:  destino,
      responsavel: autorizado,
      tipo:        req.body[`tipo_${i}`],
      descricao:   req.body[`descricao_${i}`],
      quantidade:  req.body[`quantidade_${i}`],
      unidade:     req.body[`unidade_${i}`],
      delivered:   false,
      timestamp:   Date.now()
    };
    saidas.push(item);
  }

  saveSaidas();
  io.emit('update');           // notifica clientes via WebSocket
  res.redirect('/solicitacao.html');
});

// Remove item pelo índice
app.post('/remover/:index', (req, res) => {
  const i = Number(req.params.index);
  if (!isNaN(i) && i >= 0 && i < saidas.length) {
    saidas.splice(i, 1);
    saveSaidas();
    io.emit('update');
  }
  res.redirect('/dashboard.html');
});

// Marca como entregue e move para o fim
app.post('/reordenar/:index', (req, res) => {
  const i = Number(req.params.index);
  if (!isNaN(i) && i >= 0 && i < saidas.length) {
    const it = saidas.splice(i, 1)[0];
    it.delivered = true;
    saidas.push(it);
    saveSaidas();
    io.emit('update');
  }
  res.redirect('/dashboard.html');
});

// API para obter JSON de saídas
app.get('/api/saidas', (req, res) => {
  res.json(saidas);
});

// Exporta para Excel
app.get('/exportar', async (req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Saidas');
  ws.columns = [
    { header: 'Nome',          key: 'nome',         width: 30 },
    { header: 'Local',         key: 'observacao',   width: 30 },
    { header: 'Autorizado Por',key: 'responsavel',  width: 30 },
    { header: 'Tipo',          key: 'tipo',         width: 15 },
    { header: 'Descrição',     key: 'descricao',    width: 30 },
    { header: 'Qtd',           key: 'quantidade',   width: 10 },
    { header: 'Unidade',       key: 'unidade',      width: 10 },
    { header: 'Entregue',      key: 'delivered',    width: 10 },
    { header: 'Timestamp',     key: 'timestamp',    width: 25 }
  ];
  ws.addRows(saidas);

  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename=saidas.xlsx');

  await wb.xlsx.write(res);
  res.end();
});

// Socket.IO: loga conexões
io.on('connection', socket => {
  console.log('Cliente WS conectado:', socket.id);
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});