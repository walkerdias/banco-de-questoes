// app.js — Versão 3.1 (Com Posicionamento de Imagem Customizado)

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
const formContainer = document.getElementById('formCard'); 
const headerControls = document.querySelector('header .controls'); 
const topBarControls = document.querySelector('.top-bar .search'); 
const topBarControls2 = document.querySelector('.top-bar .search:nth-child(2)');

const questoesCountEl = document.getElementById('questoesCount');

// Novos Filtros e Controles
const fAno = document.getElementById('fAno');
const fBanca = document.getElementById('fBanca');
const fDisciplina = document.getElementById('fDisciplina');
const fRevisao = document.getElementById('fRevisao'); 
const fQtdTreino = document.getElementById('fQtdTreino'); 

// Paginação
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageInfo = document.getElementById('pageInfo');
const paginationControls = document.getElementById('paginationControls');

// Input de Imagem e Helper
const inpImagem = document.getElementById('inpImagem');
const imgPreview = document.getElementById('imgPreview');
const btnRemoverImg = document.getElementById('btnRemoverImg');
const btnInsertImgTag = document.getElementById('btnInsertImgTag'); // NOVO BOTÃO
const txtEnunciado = document.getElementById('enunciado');

const btnSalvar = document.getElementById('btnSalvar');
const btnCancelar = document.getElementById('btnCancelar');
const btnImport = document.getElementById('btnImport');
const btnExport = document.getElementById('btnExport');
const btnLimpar = document.getElementById('btnLimpar');
const btnNovo = document.getElementById('btnNovo');
const btnQuiz = document.getElementById('btnQuiz');
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

let currentPage = 1;
const ITEMS_PER_PAGE = 20;

/* ---------------------------
   Utilitários
----------------------------*/
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function saveBD(){
  try {
    localStorage.setItem('BD_QUESTOES', JSON.stringify(BD));
  } catch (e) {
    if(e.name === 'QuotaExceededError') {
      showToast("Erro: Limite de armazenamento cheio! Tente imagens menores.", "error");
    }
  }
}

function escapeHtml(txt){
  if(!txt && txt !== 0) return '';
  let safeTxt = String(txt)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
  return safeTxt.replaceAll('\n', '<br>'); 
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

// NOVA FUNÇÃO: Processa o texto e a imagem para decidir onde renderizar
function renderEnunciadoWithImage(enunciado, imagemBase64, isQuiz = false) {
    const safeText = escapeHtml(enunciado);
    
    if (!imagemBase64) {
        // Sem imagem, retorna apenas o texto formatado
        return safeText;
    }

    const imgClass = isQuiz ? "q-image quiz-image" : "q-image";
    const imgTag = `<img src="${imagemBase64}" class="${imgClass}" alt="Imagem da questão">`;
    const placeHolder = '[IMAGEM]';

    if (safeText.includes(placeHolder)) {
        // Se encontrou a tag [IMAGEM], substitui ela pela imagem real
        return safeText.replace(placeHolder, imgTag);
    } else {
        // Padrão antigo: Imagem em cima + Texto em baixo
        // Vamos retornar o HTML concatenado para ser inserido no innerHTML do container
        // Nota: No código original o <p> envolvia o texto. Aqui vamos retornar a string bruta para ser envelopada depois ou já formatada.
        // Para manter consistência com a função renderQuestions antiga, vamos retornar um objeto ou string especial?
        // Simplificação: Vamos retornar o HTML "final" que vai dentro do <p> ou div principal.
        
        return `${imgTag}<br>${safeText}`;
    }
}

/* ---------------------------
   Timer
----------------------------*/
function startTimer() {
  stopTimer(); 
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
   Controle do Formulário
----------------------------*/
function abrirFormulario() {
  clearForm(); 
  formContainer.style.display = 'block';
  formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('disciplina').focus();
}

function fecharFormulario() {
  formContainer.style.display = 'none';
  clearForm();
}

/* ---------------------------
   Imagem e Tag Helper
----------------------------*/
let currentImageBase64 = null;

inpImagem.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    if(file.size > 2 * 1024 * 1024) {
      showToast("Imagem muito grande! Máximo de 2MB.", "error");
      this.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(evt) {
      currentImageBase64 = evt.target.result;
      imgPreview.src = currentImageBase64;
      imgPreview.style.display = 'block';
      btnRemoverImg.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  }
});

btnRemoverImg.addEventListener('click', function() {
  currentImageBase64 = null;
  inpImagem.value = '';
  imgPreview.style.display = 'none';
  imgPreview.src = '';
  this.style.display = 'none';
});

// NOVO: Botão para inserir a tag [IMAGEM] onde o cursor estiver
btnInsertImgTag.addEventListener('click', function() {
    const tag = " [IMAGEM] ";
    const startPos = txtEnunciado.selectionStart;
    const endPos = txtEnunciado.selectionEnd;
    
    if (startPos || startPos == '0') {
        txtEnunciado.value = txtEnunciado.value.substring(0, startPos)
            + tag
            + txtEnunciado.value.substring(endPos, txtEnunciado.value.length);
        txtEnunciado.focus();
        txtEnunciado.selectionStart = startPos + tag.length;
        txtEnunciado.selectionEnd = startPos + tag.length;
    } else {
        txtEnunciado.value += tag;
        txtEnunciado.focus();
    }
});

/* ---------------------------
   Tema
----------------------------*/
function loadTheme() {
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

/* ---------------------------
   Renderização e Paginação
----------------------------*/
function renderQuestions(){
  if(inQuiz) {
      if(questoesCountEl) questoesCountEl.style.display = 'none';
      if(paginationControls) paginationControls.style.display = 'none';
      return;
  }
  
  lista.classList.remove('quiz-container');
  lista.classList.add('list'); 

  const termo = fSearch.value.toLowerCase().trim();
  const filteredBD = getFilteredBD(); // Usa a função centralizada

  // Atualiza contadores
  const total = filteredBD.length;
  if (questoesCountEl) {
     questoesCountEl.style.display = 'block'; 
     questoesCountEl.innerHTML = `Total: <span style="color: var(--accent)">${total}</span> questões`;
  }

  if(total === 0){
    lista.innerHTML = `<p class="meta" style="text-align:center; padding: 20px;">Nenhuma questão encontrada.</p>`;
    paginationControls.style.display = 'none';
    return;
  }

  // Paginação
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = filteredBD.slice(start, end);

  lista.innerHTML = pageItems.map(q => {
    const stats = q.stats || { correct: 0, wrong: 0 };
    const totalAttempts = stats.correct + stats.wrong;
    const perc = totalAttempts > 0 ? Math.round((stats.correct / totalAttempts) * 100) : 0;
    const statsHtml = totalAttempts > 0 
       ? `<span class="stats-badge" title="${stats.correct} acertos / ${stats.wrong} erros">Tx. Acerto: ${perc}% (${totalAttempts}x)</span>` 
       : '';

    const revClass = q.revisao ? 'active' : '';
    const revTitle = q.revisao ? 'Remover da Revisão' : 'Marcar para Revisão';

    // Lógica de Imagem e Enunciado (NOVO)
    // Se o usuário usou [IMAGEM], a imagem estará embutida no contentHtml.
    // Se não, ela estará no topo do contentHtml.
    const contentHtml = renderEnunciadoWithImage(q.enunciado, q.imagem, false);

    return `
    <div class="qitem" id="q-${q.id}">
      <div class="meta header-meta">
        <div>
            ${escapeHtml(q.disciplina || 'Disciplina')} — ${escapeHtml(q.banca || 'Banca')} (${escapeHtml(q.ano || 'Ano')})
            <br>
            <b>${escapeHtml(q.assunto)}</b> — ${escapeHtml(q.topico)}
        </div>
        <div style="text-align:right;">
            <button class="btn-icon ${revClass}" onclick="toggleRevisao(${q.id})" title="${revTitle}">🚩</button>
            <br>
            <small>Correta: <b>${escapeHtml(q.correta)}</b></small>
        </div>
      </div>

      <p style="margin: 8px 0;">${contentHtml}</p>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <div>
             ${q.tags.split(',').filter(t => t.trim()).map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}
             ${statsHtml}
          </div>
      </div>

      <div class="actions">
        <button onclick="editQ(${q.id})" class="btn secondary">Editar</button>
        <button onclick="delQ(${q.id})" class="btn secondary" style="background: var(--danger)">Excluir</button>
        <button onclick="copyQuestion(${q.id})" class="btn secondary" style="background: var(--success)">Copiar</button>
      </div>
    </div>
  `}).join('');

  paginationControls.style.display = totalPages > 1 ? 'flex' : 'none';
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  btnPrevPage.disabled = currentPage === 1;
  btnNextPage.disabled = currentPage === totalPages;
}

btnPrevPage.addEventListener('click', () => {
  if(currentPage > 1) {
    currentPage--;
    renderQuestions();
    lista.scrollTop = 0;
  }
});
btnNextPage.addEventListener('click', () => {
    currentPage++;
    renderQuestions();
    lista.scrollTop = 0;
});

// Filtros
function updateFilterOptions() {
  const curAssunto = fAssunto.value;
  const curAno = fAno.value;
  const curBanca = fBanca.value;
  const curDisciplina = fDisciplina.value;

  // Para popular os selects, precisamos do BD inteiro filtrado parcialmente
  // Mas para simplificar, vamos usar o BD global para extrair tudo por enquanto, ou criar função auxiliar getFilteredBD(ignore)
  // Código anterior já tinha getFilteredBD, vamos mantê-lo abaixo.
  
  const listForAssunto = getFilteredBD('assunto');
  const assuntos = [...new Set(listForAssunto.map(q => q.assunto).filter(a => a))].sort();
  renderSelectOptions(fAssunto, "Todos os assuntos", assuntos, curAssunto);

  const listForDisciplina = getFilteredBD('disciplina');
  const disciplinas = [...new Set(listForDisciplina.map(q => q.disciplina).filter(a => a))].sort();
  renderSelectOptions(fDisciplina, "Todas as disciplinas", disciplinas, curDisciplina);

  const listForBanca = getFilteredBD('banca');
  const bancas = [...new Set(listForBanca.map(q => q.banca).filter(a => a))].sort();
  renderSelectOptions(fBanca, "Todas as bancas", bancas, curBanca);

  const listForAno = getFilteredBD('ano');
  const anos = [...new Set(listForAno.map(q => String(q.ano)).filter(a => a))].sort((a, b) => b - a);
  renderSelectOptions(fAno, "Todos os anos", anos, curAno);
}

function getFilteredBD(ignoreField) {
  const termo = fSearch.value.toLowerCase().trim();
  const valAssunto = fAssunto.value;
  const valAno = fAno.value;
  const valBanca = fBanca.value;
  const valDisciplina = fDisciplina.value;
  const valRevisao = fRevisao.checked;

  return BD.filter(q => {
    const matchSearch = !termo || 
                        q.enunciado.toLowerCase().includes(termo) ||
                        q.assunto.toLowerCase().includes(termo) ||
                        q.topico.toLowerCase().includes(termo) ||
                        q.tags.toLowerCase().includes(termo);

    const matchAssunto = ignoreField === 'assunto' || !valAssunto || q.assunto === valAssunto;
    const matchAno = ignoreField === 'ano' || !valAno || String(q.ano) === valAno;
    const matchBanca = ignoreField === 'banca' || !valBanca || q.banca === valBanca;
    const matchDisciplina = ignoreField === 'disciplina' || !valDisciplina || q.disciplina === valDisciplina;
    const matchRevisao = !valRevisao || q.revisao === true;
    
    return matchSearch && matchAssunto && matchAno && matchBanca && matchDisciplina && matchRevisao;
  });
}

function renderSelectOptions(selectEl, defaultText, optionsArray, currentValue) {
  selectEl.innerHTML = `<option value="">${defaultText}</option>` + 
                       optionsArray.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
  if (currentValue && optionsArray.includes(currentValue)) {
      selectEl.value = currentValue;
  } else {
      selectEl.value = "";
  }
}

function onFilterChange() {
  currentPage = 1; 
  updateFilterOptions();
  renderQuestions();
}

/* ---------------------------
   CRUD
----------------------------*/
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
    ano: document.getElementById('ano').value.trim(),
    banca: document.getElementById('banca').value.trim(),
    disciplina: document.getElementById('disciplina').value.trim(),
    imagem: currentImageBase64 
  };

  if(!novaQuestao.enunciado || !novaQuestao.correta || !novaQuestao.assunto){
    showToast("Preencha Enunciado, Assunto e Resposta Correta.", "error"); 
    return;
  }

  if(id){
    const index = BD.findIndex(q => q.id == id);
    if(index !== -1){
      BD[index] = { 
          ...BD[index], 
          ...novaQuestao, 
          stats: BD[index].stats || {correct:0, wrong:0},
          revisao: BD[index].revisao || false
      };
    }
  } else {
    novaQuestao.id = Date.now(); 
    novaQuestao.stats = { correct: 0, wrong: 0 };
    novaQuestao.revisao = false;
    BD.push(novaQuestao);
  }

  saveBD();
  showToast("Questão salva com sucesso!", "success");
  fecharFormulario(); 
  updateFilterOptions(); 
  renderQuestions();
}

function clearForm(){
  form.reset();
  document.getElementById('qid').value = '';
  currentImageBase64 = null;
  imgPreview.src = '';
  imgPreview.style.display = 'none';
  btnRemoverImg.style.display = 'none';
}

/* ---------------------------
   Ações
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
  document.getElementById('ano').value = q.ano;
  document.getElementById('banca').value = q.banca;
  document.getElementById('disciplina').value = q.disciplina;

  if(q.imagem) {
      currentImageBase64 = q.imagem;
      imgPreview.src = q.imagem;
      imgPreview.style.display = 'block';
      btnRemoverImg.style.display = 'inline-block';
  } else {
      currentImageBase64 = null;
      imgPreview.style.display = 'none';
      btnRemoverImg.style.display = 'none';
  }

  formContainer.style.display = 'block';
  formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('assunto').focus();
}

function delQ(id){
  if(!confirm('Excluir esta questão?')) return;
  BD = BD.filter(q => q.id != id);
  saveBD();
  showToast("Questão excluída.", "info");
  renderQuestions();
  updateFilterOptions();
}

function toggleRevisao(id) {
    const index = BD.findIndex(q => q.id == id);
    if(index !== -1) {
        BD[index].revisao = !BD[index].revisao;
        saveBD();
        renderQuestions();
        const msg = BD[index].revisao ? "Adicionada à Revisão" : "Removida da Revisão";
        showToast(msg, "info");
    }
}

function copyQuestion(id){
  const q = BD.find(x => x.id == id);
  if(!q) return;
  
  const text = `Disciplina: ${q.disciplina || 'N/A'} / Ano: ${q.ano || 'N/A'} / Banca: ${q.banca || 'N/A'}\n${q.assunto} — ${q.topico}\n\n${q.enunciado}\n\nA) ${q.A}\nB) ${q.B}\nC) ${q.C}\nD) ${q.D}\nE) ${q.E}\n\nResposta: ${q.correta}\n\nResolução: ${q.resolucao || 'N/A'}`;
  
  try {
    const tempElement = document.createElement('textarea');
    tempElement.value = text;
    document.body.appendChild(tempElement);
    tempElement.select();
    document.execCommand('copy');
    document.body.removeChild(tempElement);
    showToast('Copiado!', 'success');
  } catch (err) {
    showToast('Erro ao copiar.', 'error');
  }
}

window.editQ = editQ;
window.delQ = delQ;
window.copyQuestion = copyQuestion;
window.toggleRevisao = toggleRevisao;

/* ---------------------------
   Importar / Exportar
----------------------------*/
function exportDB(){
  const dataStr = JSON.stringify(BD, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `banco_questoes_${new Date().toISOString().slice(0,10)}.json`;
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  showToast("Exportação iniciada.", "info");
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
        updateFilterOptions();
        renderQuestions();
        showToast('Importado com sucesso!', 'success');
      } else {
        showToast('Formato inválido.', 'error');
      }
    } catch (error) {
      showToast('Erro ao ler arquivo.', 'error');
    }
  };
  reader.readAsText(file);
});

function clearDB(){
  if(confirm('ATENÇÃO: Isso apaga TUDO! Continuar?')){
    BD = [];
    saveBD();
    updateFilterOptions();
    renderQuestions();
    showToast("Banco de dados limpo.", "info");
  }
}

/* ---------------------------
   Modo Quiz / Treino
----------------------------*/
function initQuiz(){
  if(BD.length === 0){
    showToast('Adicione questões primeiro.', 'error');
    return;
  }
  
  headerControls.style.display = 'none';
  formContainer.style.display = 'none';
  topBarControls.style.display = 'none';
  if(topBarControls2) topBarControls2.style.display = 'none';
  if(paginationControls) paginationControls.style.display = 'none';
  if (questoesCountEl) questoesCountEl.style.display = 'none';

  const filteredForQuiz = getFilteredBD(); // Usa filtro atual

  if(filteredForQuiz.length === 0){
    showToast('Nenhuma questão para os filtros atuais.', 'error');
    sairTreino(false); 
    return;
  }

  filteredForQuiz.sort(() => Math.random() - 0.5);

  const limit = parseInt(fQtdTreino.value) || 0; 
  if (limit > 0 && limit < filteredForQuiz.length) {
      quizOrder = filteredForQuiz.slice(0, limit);
  } else {
      quizOrder = filteredForQuiz;
  }
  
  lista.classList.remove('list');
  lista.classList.add('quiz-container');

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
      <button onclick="sairTreino(false)" class="btn primary">Voltar ao Banco</button>
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
  ].filter(opt => opt.texto); 

  // Lógica da Imagem (NOVO)
  const contentHtml = renderEnunciadoWithImage(q.enunciado, q.imagem, true);

  lista.innerHTML = `
    <div class="card quiz-card">
      <p class="meta" style="margin-bottom: 5px;">
        Questão ${current}/${total}
      </p>
      <p class="meta" style="margin-bottom: 15px;">
        ${escapeHtml(q.disciplina || 'N/A')} — ${escapeHtml(q.banca || 'N/A')} (${escapeHtml(q.ano || 'N/A')})
        <br>
        <b>${escapeHtml(q.assunto)}</b> — ${escapeHtml(q.topico)}
      </p>
      
      <p style="font-size: 1.1rem; font-weight: 500;">${contentHtml}</p>

      <div id="opcoesQuiz" style="margin-top: 20px;">
        ${opcoes.map(opt => `
          <button class="quiz-option" onclick="checarResposta(this, '${opt.letra}', ${q.id})">
            ${opt.letra}) ${escapeHtml(opt.texto)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  resolucaoEl.innerHTML = '';
  quizActions.innerHTML = `
    <button id="btnSair" onclick="sairTreino()" class="btn secondary">Sair</button>
    <button id="btnPular" onclick="pularPergunta()" class="btn secondary" style="margin-left: 10px;">Pular</button>
  `;
}

function checarResposta(btn, letra, id){
  const q = quizOrder.find(x => x.id == id);
  const realQ = BD.find(x => x.id == id);
  
  if(!q) return;

  const opcoes = document.querySelectorAll('.quiz-option');
  opcoes.forEach(option => option.disabled = true);
  btn.classList.add('selecionada'); 
  const quizActions = document.getElementById('quizActions');
  const btnPular = document.getElementById('btnPular');
  if(btnPular) btnPular.remove();

  if(realQ) {
      if(!realQ.stats) realQ.stats = { correct: 0, wrong: 0 };
      if(letra === q.correta) {
          realQ.stats.correct++;
      } else {
          realQ.stats.wrong++;
      }
      saveBD(); 
  }

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
  let acertou = false;

  opcoes.forEach(option => {
    const text = option.textContent.trim();
    const letra = text.substring(0, 1);
    if(letra === q.correta){
      option.classList.add('certa');
	  if(option.classList.contains('selecionada')) acertou = true; 
    }
    if(option.classList.contains('selecionada') && letra !== q.correta){
      option.classList.add('errada');
    }
    option.classList.remove('selecionada');
  });
  
  let feedbackHTML = acertou 
    ? `<div class="quiz-feedback acerto">✅ Correto!</div>`
    : `<div class="quiz-feedback erro">❌ Incorreto. A correta é ${q.correta}.</div>`;
	
  const resolucao = `<div class="quiz-resolucao"><strong>Resolução:</strong><br>${escapeHtml(q.resolucao || 'Nenhuma resolução cadastrada.')}</div>`;
  resolucaoEl.innerHTML = feedbackHTML + resolucao; 

  const quizActions = document.getElementById('quizActions');
  const btnVerResp = document.getElementById('btnVerResp');
  if(btnVerResp) btnVerResp.remove();

  quizActions.innerHTML += `
    <button id="btnProx" onclick="proximaPergunta()" class="btn primary" style="margin-left: 10px;">Próxima</button>
  `;
}

function proximaPergunta(){
  quizIndex++;
  mostrarQuiz();
}

function pularPergunta(){
  const q = quizOrder.splice(quizIndex, 1)[0]; 
  quizOrder.push(q);
  mostrarQuiz(); 
}

function sairTreino(askConfirm = true){
  if(askConfirm && !confirm('Sair do treino?')) return;

  stopTimer();
  inQuiz = false;
  quizTimerEl.style.display = 'none';

  headerControls.style.display = 'flex';
  formContainer.style.display = 'none'; 
  topBarControls.style.display = 'flex';
  if(topBarControls2) topBarControls2.style.display = 'flex'; 
  renderQuestions(); 
}

form.addEventListener('submit', saveQuestion);
btnCancelar.addEventListener('click', fecharFormulario); 
btnExport.addEventListener('click', exportDB);
btnImport.addEventListener('click', importDB);
btnLimpar.addEventListener('click', clearDB);
btnNovo.addEventListener('click', abrirFormulario); 
btnQuiz.addEventListener('click', initQuiz);

fSearch.addEventListener('input', () => { currentPage = 1; renderQuestions(); });
fAssunto.addEventListener('change', onFilterChange);
fAno.addEventListener('change', onFilterChange);
fBanca.addEventListener('change', onFilterChange);
fDisciplina.addEventListener('change', onFilterChange);
fRevisao.addEventListener('change', onFilterChange);
themeToggle.addEventListener('click', toggleTheme); 

function init(){
  loadTheme(); 
  updateFilterOptions();
  renderQuestions();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(console.error);
  }
}

init();