
function generateTodayReport() {
  fetch('/exportar-relatorio')
    .then(response => {
      if (response.ok) {
        alert('Relatório do dia exportado com sucesso!');
      } else {
        alert('Erro ao exportar o relatório do dia.');
      }
    });
}

function exportCompleteReport() {
  fetch('/exportar-relatorio-completo')
    .then(response => {
      if (response.ok) {
        alert('Relatório completo exportado com sucesso!');
      } else {
        alert('Erro ao exportar o relatório completo.');
      }
    });
}

function viewReports() {
  fetch('/api/saidas')
    .then(response => response.json())
    .then(data => {
      const tbody = document.querySelector('#reportTable tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      const grouped = {};

      data.forEach(item => {
        const date = item.data || new Date(item.timestamp).toISOString().split('T')[0];
        const tipo = item.tipo;
        const key = `${date}|${tipo}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });

      Object.entries(grouped).forEach(([key, items]) => {
        const [data, tipo] = key.split('|');
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${data}</td>
          <td>${tipo}</td>
          <td>${items.length}</td>
          <td><button onclick="alert('Detalhamento futuro')">Ver</button></td>
        `;
        tbody.appendChild(row);
      });
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const url = window.location.pathname;
  if (url.includes('relatorios.html')) {
    viewReports();
  }
});
