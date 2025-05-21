
const express = require('express');
const fs = require('fs');
const path = require('path');
const socketIO = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'relatorio.json');

app.use(express.static('public'));
app.use(express.json());

const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const carregarDados = () => {
  try {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao carregar o arquivo:', err);
    return [];
  }
};

const salvarDados = (dados) => {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(dados, null, 2));
  } catch (err) {
    console.error('Erro ao salvar o arquivo:', err);
  }
};

app.get('/api/saidas', (req, res) => {
  const dados = carregarDados();
  res.json(dados);
});

app.post('/remover/:index', (req, res) => {
  const index = parseInt(req.params.index);
  const dados = carregarDados();
  if (index >= 0 && index < dados.length) {
    dados.splice(index, 1);
    salvarDados(dados);
    io.emit('update');
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.post('/reordenar/:index', (req, res) => {
  const index = parseInt(req.params.index);
  const dados = carregarDados();
  if (index >= 0 && index < dados.length) {
    dados[index].delivered = !dados[index].delivered;
    salvarDados(dados);
    io.emit('update');
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get('/exportar-relatorio', (req, res) => {
  const currentDate = getCurrentDate();
  const dados = carregarDados();
  const relatorioDoDia = dados.filter(item => item.data === currentDate);
  if (relatorioDoDia.length === 0) {
    res.status(404).send('Nenhum item encontrado para o dia atual');
    return;
  }
  const relatorioDiaPath = path.join(__dirname, `relatorio_${currentDate}.json`);
  fs.writeFile(relatorioDiaPath, JSON.stringify(relatorioDoDia, null, 2), (err) => {
    if (err) {
      res.status(500).send('Erro ao criar o relatório do dia');
      return;
    }
    res.download(relatorioDiaPath, `relatorio_${currentDate}.json`);
  });
});

app.get('/exportar-relatorio-completo', (req, res) => {
  const dados = carregarDados();
  if (dados.length === 0) {
    res.status(404).send('Nenhum item encontrado');
    return;
  }
  const relatorioPath = path.join(__dirname, 'relatorio_completo.json');
  fs.writeFile(relatorioPath, JSON.stringify(dados, null, 2), (err) => {
    if (err) {
      res.status(500).send('Erro ao criar o relatório completo');
      return;
    }
    res.download(relatorioPath, 'relatorio_completo.json');
  });
});

app.post('/adicionar', (req, res) => {
  const { nome, descricao, quantidade, unidade, tipo } = req.body;
  const data = getCurrentDate();
  const novoItem = { nome, descricao, quantidade, unidade, tipo, data, delivered: false };
  const dados = carregarDados();
  dados.push(novoItem);
  salvarDados(dados);
  io.emit('update');
  res.sendStatus(201);
});

app.use(express.urlencoded({ extended: true })); // Necessário para forms HTML

// ✅ NOVA ROTA para receber o formulário de itens.html
app.post('/itens', (req, res) => {
  console.log('Dados recebidos do formulário:', req.body);
  res.redirect('/solicitacao.html');
});

// Redirecionar raiz para a página de solicitação
app.get('/', (req, res) => {
  res.redirect('/solicitacao.html');
});

// Iniciando o servidor
io.on('connection', (socket) => {
  console.log('Novo cliente conectado');
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
