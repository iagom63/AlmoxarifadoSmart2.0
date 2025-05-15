const express = require('express');
const fs = require('fs');
const path = require('path');
const socketIO = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;
const FILE_PATH = path.join(__dirname, 'relatorio.json');

app.use(express.static('public'));
app.use(express.json());

const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Função para carregar os dados do arquivo JSON
const carregarDados = () => {
  try {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao carregar o arquivo:', err);
    return [];
  }
};

// Função para salvar os dados no arquivo JSON
const salvarDados = (dados) => {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(dados, null, 2));
  } catch (err) {
    console.error('Erro ao salvar o arquivo:', err);
  }
};

// Rota para obter todas as saídas
app.get('/api/saidas', (req, res) => {
  const dados = carregarDados();
  res.json(dados);
});

// Rota para remover um item pelo índice
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

// Rota para reordenar um item (marcar como devolvido)
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

// Rota para exportar relatório do dia atual
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

// Rota para adicionar um novo item
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

// Socket.io para atualizações em tempo real
io.on('connection', (socket) => {
  console.log('Novo cliente conectado');
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciando o servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
