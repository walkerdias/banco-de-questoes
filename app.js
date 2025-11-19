// app.js — Banco de Questões (com CRUD, import/export, modo treino, timer, PWA-ready, Modo Tema)
// Usa a chave localStorage: "BD_QUESTOES" e "theme"

"use strict";

/* ---------------------------
   Referências DOM
----------------------------*/
const form = document.getElementById('form');
const lista = document.getElementById('lista');
const fAssunto = document.getElementById('fAssunto');
const fSearch = document.getElementById('fSearch');
const quizTimerEl = document.getElementById('quizTimer');
const fileInput = document.getElementById('fileInput');

// Referências para os novos filtros (ano, banca, disciplina)
const fAno = document.getElementById('fAno');
const fBanca = document.getElementById('fBanca');
const fDisciplina = document.getElementById('fDisciplina');

const btnSalvar = document.getElementById('btnSalvar');
const btnCancelar = document.getElementById('btnCancelar');
const btnImport = document.getElementById('btnImport');
const btnExport = document.getElementById('btnExport');
const btnLimpar = document.getElementById('btnLimpar');
const btnNovo = document.getElementById('btnNovo');
const btnQuiz = document.getElementById('btnQuiz');

// NOVO: Referência para o botão de tema
const themeToggle = document.getElementById('themeToggle'); 

/* ---------------------------
   Estado / Banco em memória
----------------------------*/
let BD = JSON.parse(localStorage.getItem('BD_QUESTOES') || '[]');
let inQuiz = false;
let quizIndex = 0;
let quizOrder = [];
let timerInterval = null;
let startTime = 0;

/* ---------------------------
   Util
----------------------------*/
function saveBD(){
  localStorage.setItem('BD_QUESTOES', JSON.stringify(BD));
}

function escapeHtml(txt){
  if(!txt && txt !== 0) return '';
  let safeTxt = String(txt)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
  // Converte quebras de linha (\n) para tag HTML <br>
  return safeTxt.replaceAll('\n', '<br>'); 
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

function startTimer() {
  stopTimer(); // Garante que apenas um timer esteja ativo
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    quizTimerEl.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* ---------------------------
   NOVO: Tema (Dark/Light Mode)
----------------------------*/
function loadTheme() {
  // Pega o tema salvo, ou 'dark' como padrão
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.className = savedTheme + '-mode';
  updateThemeButton(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.body.className = newTheme + '-mode';
  localStorage.setItem('theme', newTheme);
  updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀ Modo Claro' : '🌙 Modo Escuro';
    themeToggle.title = theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro';
  }
}

/* ---------------------------\
   Renderização
----------------------------*/

// 1. Renderiza a lista de questões
function renderQuestions(){
  if(inQuiz) return;
  
  // GARANTE A VISUALIZAÇÃO CORRETA EM DESKTOP (Remove a classe de ajuste do Quiz)
  lista.classList.remove('quiz-container');
  lista.classList.add('list'); 

  const termo = fSearch.value.toLowerCase().trim();
  const assuntoFiltro = fAssunto.value;
  // NOVOS FILTROS
  const anoFiltro = fAno.value;
  const bancaFiltro = fBanca.value;
  const disciplinaFiltro = fDisciplina.value;

  const filteredBD = BD.filter(q => {
    const matchSearch = !termo || 
                        q.enunciado.toLowerCase().includes(termo) ||
                        q.assunto.toLowerCase().includes(termo) ||
                        q.topico.toLowerCase().includes(termo) ||
                        q.tags.toLowerCase().includes(termo);
    const matchAssunto = !assuntoFiltro || q.assunto === assuntoFiltro;
    // NOVAS CONDIÇÕES DE FILTRO
    const matchAno = !anoFiltro || String(q.ano) === anoFiltro;
    const matchBanca = !bancaFiltro || q.banca === bancaFiltro;
    const matchDisciplina = !disciplinaFiltro || q.disciplina === disciplinaFiltro;
    
    // ATUALIZAÇÃO DA REGRA DE FILTRAGEM
    return matchSearch && matchAssunto && matchAno && matchBanca && matchDisciplina;
  });

  if(filteredBD.length === 0){
    lista.innerHTML = `<p class="meta" style="text-align:center; padding: 20px;">Nenhuma questão encontrada com os filtros atuais.</p>`;
    return;
  }

  lista.innerHTML = filteredBD.map(q => `
    <div class="qitem" id="q-${q.id}">
      <p class="meta">
        <b>${escapeHtml(q.assunto)}</b> — ${escapeHtml(q.topico)} (${escapeHtml(q.disciplina || 'N/A')})
        <span style="float: right;">Correta: ${escapeHtml(q.correta)}</span>
        <br>
        ${escapeHtml(q.banca || 'N/A')} / ${escapeHtml(q.ano || 'N/A')}
      </p>
      <p style="margin: 8px 0;">${escapeHtml(q.enunciado)}</p>
      <div style="margin: 4px 0;">
          ${q.tags.split(',').filter(t => t.trim()).map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}
      </div>
      <div class="actions">
        <button onclick="editQ(${q.id})" class="btn secondary">Editar</button>
        <button onclick="delQ(${q.id})" class="btn secondary" style="background: var(--danger)">Excluir</button>
        <button onclick="copyQuestion(${q.id})" class="btn secondary" style="background: var(--success)">Copiar</button>
      </div>
    </div>
  `).join('');
  
  // Limpa o conteúdo do quiz
  document.getElementById('resultado').innerHTML = '';
  document.getElementById('quizActions').innerHTML = '';
}

// 2. Atualiza os filtros (assunto e os novos)
function updateSubjectFilter(){
  const assuntos = [...new Set(BD.map(q => q.assunto).filter(a => a))].sort();
  const anos = [...new Set(BD.map(q => q.ano).filter(a => a))].sort((a,b) => b - a); // Ordena decrescente
  const bancas = [...new Set(BD.map(q => q.banca).filter(a => a))].sort();
  const disciplinas = [...new Set(BD.map(q => q.disciplina).filter(a => a))].sort();

  fAssunto.innerHTML = `<option value="">Todos os assuntos (${BD.length})</option>` + 
                       assuntos.map(a => `<option>${escapeHtml(a)}</option>`).join('');

  fAno.innerHTML = `<option value="">Todos os anos</option>` + 
                   anos.map(a => `<option>${escapeHtml(a)}</option>`).join('');

  fBanca.innerHTML = `<option value="">Todas as bancas</option>` + 
                     bancas.map(a => `<option>${escapeHtml(a)}</option>`).join('');

  fDisciplina.innerHTML = `<option value="">Todas as disciplinas</option>` + 
                          disciplinas.map(a => `<option>${escapeHtml(a)}</option>`).join('');
}


/* ---------------------------\
   CRUD (Create, Read, Update, Delete)
----------------------------*/

// 1. Salvar Questão (Novo ou Edição)
function saveQuestion(e){
  e.preventDefault();

  const id = document.getElementById('qid').value;
  const novaQuestao = {
    assunto: document.getElementById('assunto').value.trim(),
    topico: document.getElementById('topico').value.trim(),
    enunciado: document.getElementById('enunciado').value.trim(),
    A: document.getElementById('optA').value.trim(),
    B: document.getElementById('optB').value.trim(),
    C: document.getElementById('optC').value.trim(),
    D: document.getElementById('optD').value.trim(),
    E: document.getElementById('optE').value.trim(),
    correta: document.getElementById('correta').value,
    resolucao: document.getElementById('resolucao').value.trim(),
    tags: document.getElementById('tags').value.toLowerCase().trim(),
    // NOVOS CAMPOS ADICIONADOS
    ano: document.getElementById('ano').value.trim(),
    banca: document.getElementById('banca').value.trim(),
    disciplina: document.getElementById('disciplina').value.trim()
  };

  if(!novaQuestao.enunciado || !novaQuestao.correta || !novaQuestao.assunto){
    // Utiliza um alerta customizado ou mensagem de erro na UI em vez de alert()
    console.error("Erro: Enunciado, Assunto e Resposta Correta são obrigatórios.");
    alert("Por favor, preencha o Enunciado, Assunto e a Resposta Correta."); 
    return;
  }

  if(id){
    // Edição (Update)
    const index = BD.findIndex(q => q.id == id);
    if(index !== -1){
      BD[index] = { ...BD[index], ...novaQuestao };
    }
  } else {
    // Nova Questão (Create)
    novaQuestao.id = Date.now(); // ID único
    BD.push(novaQuestao);
  }

  saveBD();
  clearForm();
  updateSubjectFilter();
  renderQuestions();
}

// 2. Limpar Formulário
function clearForm(){
  form.reset();
  document.getElementById('qid').value = '';
}

/* ---------------------------
   Editar / Deletar / Copiar
----------------------------*/
function editQ(id){
  const q = BD.find(x => x.id == id);
  if(!q) return;

  document.getElementById('qid').value = q.id;
  document.getElementById('assunto').value = q.assunto;
  document.getElementById('topico').value = q.topico;
  document.getElementById('enunciado').value = q.enunciado;
  document.getElementById('optA').value = q.A;
  document.getElementById('optB').value = q.B;
  document.getElementById('optC').value = q.C;
  document.getElementById('optD').value = q.D;
  document.getElementById('optE').value = q.E; 
  document.getElementById('correta').value = q.correta;
  document.getElementById('resolucao').value = q.resolucao;
  document.getElementById('tags').value = q.tags;
  // NOVO: Preenche os novos campos
  document.getElementById('ano').value = q.ano;
  document.getElementById('banca').value = q.banca;
  document.getElementById('disciplina').value = q.disciplina;


  // Garante que o formulário seja visível
  const formCard = document.getElementById('formCard');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.getElementById('assunto').focus();
}

function delQ(id){
  if(!confirm('Excluir esta questão?')) return;
  BD = BD.filter(q => q.id != id);
  saveBD();
  renderQuestions();
  updateSubjectFilter();
}

function copyQuestion(id){
  const q = BD.find(x => x.id == id);
  if(!q) return;
  // NOVO: Inclui os novos campos no texto a ser copiado
  const text = `Disciplina: ${q.disciplina || 'N/A'} / Ano: ${q.ano || 'N/A'} / Banca: ${q.banca || 'N/A'}\n${q.assunto} — ${q.topico}\n\n${q.enunciado}\n\nA) ${q.A}\nB) ${q.B}\nC) ${q.C}\nD) ${q.D}\nE) ${q.E}\n\nResposta: ${q.correta}\n\nResolução: ${q.resolucao || 'N/A'}`;
  
  try {
    const tempElement = document.createElement('textarea');
    tempElement.value = text;
    document.body.appendChild(tempElement);
    tempElement.select();
    document.execCommand('copy');
    document.body.removeChild(tempElement);

    console.log('Questão copiada para a área de transferência.');
    alert('Questão copiada para a área de transferência.');
  } catch (err) {
    console.error('Erro ao copiar: ', err);
    alert('Erro ao copiar a questão.');
  }
}

/* Expor funções globalmente para os handlers inline no HTML */
window.editQ = editQ;
window.delQ = delQ;
window.copyQuestion = copyQuestion;

/* ---------------------------\
   Importar / Exportar / Limpar
----------------------------*/
function exportDB(){
  const dataStr = JSON.stringify(BD, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = 'banco_questoes.json';
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function importDB(){
  fileInput.click();
}

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedBD = JSON.parse(event.target.result);
      if (Array.isArray(importedBD)) {
        BD = importedBD;
        saveBD();
        updateSubjectFilter();
        renderQuestions();
        alert('Banco de dados importado com sucesso!');
      } else {
        alert('Formato de arquivo JSON inválido.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao ler o arquivo JSON.');
    }
  };
  reader.readAsText(file);
});

function clearDB(){
  if(confirm('Tem certeza que deseja APAGAR TODAS AS QUESTÕES? Esta ação não pode ser desfeita.')){
    BD = [];
    saveBD();
    updateSubjectFilter();
    renderQuestions();
  }
}

/* ---------------------------\
   Modo Quiz / Treino
----------------------------*/
function initQuiz(){
  if(BD.length === 0){
    alert('Adicione questões para iniciar o modo treino.');
    return;
  }
  
  const termo = fSearch.value.toLowerCase().trim();
  const assuntoFiltro = fAssunto.value;
  // NOVOS FILTROS
  const anoFiltro = fAno.value;
  const bancaFiltro = fBanca.value;
  const disciplinaFiltro = fDisciplina.value;

  quizOrder = BD.filter(q => {
    const matchSearch = !termo || 
                        q.enunciado.toLowerCase().includes(termo) ||
                        q.assunto.toLowerCase().includes(termo) ||
                        q.topico.toLowerCase().includes(termo) ||
                        q.tags.toLowerCase().includes(termo);
    const matchAssunto = !assuntoFiltro || q.assunto === assuntoFiltro;
    // NOVAS CONDIÇÕES DE FILTRO
    const matchAno = !anoFiltro || String(q.ano) === anoFiltro;
    const matchBanca = !bancaFiltro || q.banca === bancaFiltro;
    const matchDisciplina = !disciplinaFiltro || q.disciplina === disciplinaFiltro;
    
    // ATUALIZAÇÃO DA REGRA DE FILTRAGEM
    return matchSearch && matchAssunto && matchAno && matchBanca && matchDisciplina;
  });

  if(quizOrder.length === 0){
    alert('Nenhuma questão para treino com os filtros atuais.');
    return;
  }
  
  // ADICIONA A CLASSE PARA AJUSTE DINÂMICO DE ALTURA NO DESKTOP
  lista.classList.remove('list');
  lista.classList.add('quiz-container');

  // Embaralha as questões para o treino
  quizOrder.sort(() => Math.random() - 0.5);
  
  inQuiz = true;
  quizIndex = 0;
  quizTimerEl.style.display = 'inline-block';
  startTimer();
  mostrarQuiz();
}

function mostrarQuiz(){
  if(!inQuiz || quizOrder.length === 0) return;

  const q = quizOrder[quizIndex];
  const total = quizOrder.length;
  const current = quizIndex + 1;
  const quizActions = document.getElementById('quizActions');
  const resolucaoEl = document.getElementById('resultado');

  if(!q){
    stopTimer();
    lista.innerHTML = `<div class="card quiz-card" style="text-align: center;">
      <h3>Fim do Treino!</h3>
      <p>Você completou ${total} questões em ${quizTimerEl.textContent}.</p>
      <button onclick="sairTreino()" class="btn primary">Voltar ao Banco</button>
    </div>`;
    quizTimerEl.style.display = 'none';
    resolucaoEl.innerHTML = '';
    quizActions.innerHTML = '';
    return;
  }

  const opcoes = [
    { letra: 'A', texto: q.A },
    { letra: 'B', texto: q.B },
    { letra: 'C', texto: q.C },
    { letra: 'D', texto: q.D },
    { letra: 'E', texto: q.E }
  ].filter(opt => opt.texto); // Remove opções vazias

  lista.innerHTML = `
    <div class="card quiz-card">
      <p class="meta" style="margin-bottom: 5px;">
        Questão ${current}/${total}
      </p>
      <p class="meta" style="margin-bottom: 15px;">
        <b>${escapeHtml(q.disciplina || 'N/A')}</b> — ${escapeHtml(q.assunto)} (${escapeHtml(q.topico)})
        <br>
        Banca: ${escapeHtml(q.banca || 'N/A')} / Ano: ${escapeHtml(q.ano || 'N/A')}
      </p>
      <p style="font-size: 1.1rem; font-weight: 500;">${escapeHtml(q.enunciado)}</p>
      <div id="opcoesQuiz" style="margin-top: 20px;">
        ${opcoes.map(opt => `
          <button class="quiz-option" onclick="checarResposta(this, '${opt.letra}', ${q.id})">
            ${opt.letra}) ${escapeHtml(opt.texto)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  // Limpa o resultado anterior e configura a ação inicial: Sair e Pular
  resolucaoEl.innerHTML = '';
  quizActions.innerHTML = `
    <button id="btnSair" onclick="sairTreino()" class="btn secondary">Sair do Treino</button>
    <button id="btnPular" onclick="pularPergunta()" class="btn secondary" style="margin-left: 10px;">Pular Questão</button>
  `;
}

function checarResposta(btn, letra, id){
  const q = quizOrder.find(x => x.id == id);
  if(!q) return;

  const opcoes = document.querySelectorAll('.quiz-option');
  
// 1. Desativa todas as opções
  opcoes.forEach(option => {
    option.disabled = true;
  });
  
  // 2. Marca a opção do usuário (sem revelar se está certo ou errado)
  btn.classList.add('selecionada'); 

  // 3. Adiciona o botão "Ver Resposta"
  const quizActions = document.getElementById('quizActions');
  // Remove o botão Pular se existir, pois não faz sentido pular após selecionar
  const btnPular = document.getElementById('btnPular');
  if(btnPular) btnPular.remove();

  // Adiciona o botão "Ver Resposta"
  if (!document.getElementById('btnVerResp')) {
      quizActions.innerHTML += `
          <button id="btnVerResp" onclick="mostrarResolucao()" class="btn primary" style="margin-left: 10px;">Ver Resposta</button>
      `;
  }
}

function mostrarResolucao(){
  const q = quizOrder[quizIndex];
  if(!q) return;

  const opcoes = document.querySelectorAll('.quiz-option');
  const resolucaoEl = document.getElementById('resultado');

  // 1. APLICA CORES (REVELA A RESPOSTA)
  opcoes.forEach(option => {
    // Pega a letra da opção (Ex: 'A', 'B', 'C'...)
    const text = option.textContent.trim();
    const letra = text.substring(0, 1);
    
    // Marca a resposta correta em verde
    if(letra === q.correta){
      option.classList.add('certa');
    }
    
    // Marca a opção do usuário em vermelho, se estiver errada
    if(option.classList.contains('selecionada') && letra !== q.correta){
      option.classList.add('errada');
    }
    
    // Remove a classe de seleção temporária
    option.classList.remove('selecionada');
  });
  
  // 2. Mostrar a resolução
  const resolucao = `<div class="quiz-resolucao"><strong>Resolução:</strong><br>${escapeHtml(q.resolucao || 'Nenhuma resolução cadastrada.')}</div>`;
  resolucaoEl.innerHTML = resolucao;

  // 3. Remover o botão "Ver Resposta" e adicionar o "Próxima Questão"
  const quizActions = document.getElementById('quizActions');
  const btnVerResp = document.getElementById('btnVerResp');
  if(btnVerResp) btnVerResp.remove();

  // Adiciona o botão Próxima Questão
  quizActions.innerHTML += `
    <button id="btnProx" onclick="proximaPergunta()" class="btn primary" style="margin-left: 10px;">Próxima Questão</button>
  `;
}

function proximaPergunta(){
  quizIndex++;
  mostrarQuiz();
}

// NOVO: Pular Questão
function pularPergunta(){
  // Move a questão atual para o final do array, sem mudar o quizIndex
  const q = quizOrder.splice(quizIndex, 1)[0]; 
  quizOrder.push(q);
  mostrarQuiz(); 
}

function sairTreino(){
  if(confirm('Sair do treino?')) {
    stopTimer();
    inQuiz = false;
    quizTimerEl.style.display = 'none';
    renderQuestions(); // Volta para a visualização normal (renderQuestions remove quiz-container)
  }
}

/* ---------------------------\
   Event Listeners e Inicialização
----------------------------*/
form.addEventListener('submit', saveQuestion);
btnCancelar.addEventListener('click', clearForm);
btnExport.addEventListener('click', exportDB);
btnImport.addEventListener('click', importDB);
btnLimpar.addEventListener('click', clearDB);
btnNovo.addEventListener('click', clearForm);
btnQuiz.addEventListener('click', initQuiz);
fSearch.addEventListener('input', renderQuestions);
fAssunto.addEventListener('change', renderQuestions);
// NOVOS LISTENERS PARA OS NOVOS FILTROS
fAno.addEventListener('change', renderQuestions);
fBanca.addEventListener('change', renderQuestions);
fDisciplina.addEventListener('change', renderQuestions);
// NOVO: Listener do botão de tema
themeToggle.addEventListener('click', toggleTheme); 


// Inicialização e Registro do Service Worker
function init(){
  loadTheme(); // NOVO: Carrega a preferência de tema antes de renderizar
  updateSubjectFilter();
  renderQuestions();

  // Registro do Service Worker para o PWA
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js')
      .then(()=> console.log('Service Worker registrado com sucesso.'))
      .catch(error => console.error('Falha no registro do Service Worker:', error));
  }
}

init();