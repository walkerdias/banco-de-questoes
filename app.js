// app.js — Versão 5.4 (Correção: Edição de Questão)

"use strict";

/* ---------------------------
   Referências DOM
----------------------------*/
const form = document.getElementById('form');
const lista = document.getElementById('lista');
const fAssunto = document.getElementById('fAssunto');
const fSearch = document.getElementById('fSearch');
const quizTimerEl = document.getElementById('quizTimer');
const timerContainer = document.getElementById('timerContainer');
const fileInput = document.getElementById('fileInput');
const formContainer = document.getElementById('formCard'); 
const headerControls = document.querySelector('header .controls'); 

const questoesCountEl = document.getElementById('questoesCount');

// Filtros
const fAno = document.getElementById('fAno');
const fBanca = document.getElementById('fBanca');
const fDisciplina = document.getElementById('fDisciplina');
const fRevisao = document.getElementById('fRevisao'); 
const fQtdTreino = document.getElementById('fQtdTreino');
const fDificuldade = document.getElementById('fDificuldade'); 

// Cadernos e Meta
const savedFiltersSelect = document.getElementById('savedFilters');
const btnSaveFilter = document.getElementById('btnSaveFilter');
const btnDeleteFilter = document.getElementById('btnDeleteFilter');
const goalText = document.getElementById('goalText');
const goalBarFill = document.getElementById('goalBarFill');

// Estatísticas
const btnStats = document.getElementById('btnStats');
const statsModal = document.getElementById('statsModal');
const btnCloseStats = document.getElementById('btnCloseStats');
const statsBody = document.getElementById('statsBody');

// Paginação
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageInfo = document.getElementById('pageInfo');
const paginationControls = document.getElementById('paginationControls');

// Imagem
const inpImagem = document.getElementById('inpImagem');
const imgPreview = document.getElementById('imgPreview');
const btnRemoverImg = document.getElementById('btnRemoverImg');
const btnInsertImgTag = document.getElementById('btnInsertImgTag');
const txtEnunciado = document.getElementById('enunciado');

// Botões Gerais
const btnSalvar = document.getElementById('btnSalvar');
const btnCancelar = document.getElementById('btnCancelar');
const btnImport = document.getElementById('btnImport');
const btnExport = document.getElementById('btnExport');
const btnLimpar = document.getElementById('btnLimpar');
const btnNovo = document.getElementById('btnNovo');
const btnQuiz = document.getElementById('btnQuiz');
const themeToggle = document.getElementById('themeToggle'); 

/* ---------------------------
   Estado e Dados
----------------------------*/
let BD = JSON.parse(localStorage.getItem('BD_QUESTOES') || '[]');
let SAVED_FILTERS = JSON.parse(localStorage.getItem('BD_FILTROS') || '{}');
let DAILY_GOAL = JSON.parse(localStorage.getItem('BD_DAILY_GOAL') || '{"date": "", "count": 0, "target": 20}');

let inQuiz = false;
let quizIndex = 0;
let quizOrder = [];
let timerInterval = null;
let startTime = 0;

let currentPage = 1;
const ITEMS_PER_PAGE = 20;
let questionsSinceBackup = 0;

/* ---------------------------
   Utilitários
----------------------------*/
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
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
      showToast("Erro: Limite cheio! Apague questões.", "error");
    }
  }
}

function escapeHtml(txt){
  if(!txt && txt !== 0) return '';
  let safeTxt = String(txt).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  return safeTxt.replaceAll('\n', '<br>'); 
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

function startTimer() {
  startTime = Date.now();
  if(quizTimerEl) quizTimerEl.textContent = "00:00";
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    if(quizTimerEl) quizTimerEl.textContent = formatTime(elapsed);
  }, 1000);
}

function stopTimer() {
  if(timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
  }
}

function renderEnunciadoWithImage(enunciado, imagemBase64, isQuiz = false) {
    const safeText = escapeHtml(enunciado || ""); 
    if (!imagemBase64) return safeText;

    const imgClass = isQuiz ? "q-image quiz-image" : "q-image";
    const imgTag = `<img src="${imagemBase64}" class="${imgClass}" alt="Imagem">`;
    const placeHolder = '[IMAGEM]';

    if (safeText.includes(placeHolder)) {
        return safeText.replace(placeHolder, imgTag);
    } else {
        return `${imgTag}<br>${safeText}`;
    }
}

/* ---------------------------
   Migração Automática
----------------------------*/
function migrateOldQuestions() {
  let count = 0;
  BD.forEach(q => {
    if (!q.dificuldade || q.dificuldade === "") {
      q.dificuldade = 'Média'; 
      count++;
    }
    if (!q.stats) q.stats = { correct: 0, wrong: 0 }; 
  });
  if (count > 0) saveBD();
}

/* ---------------------------
   Quiz Core
----------------------------*/
function initQuiz(){
  try {
      if(BD.length === 0){
        showToast('Adicione questões primeiro.', 'error');
        return;
      }
      
      // UI Reset
      headerControls.style.display = 'none';
      formContainer.style.display = 'none';
      if(paginationControls) paginationControls.style.display = 'none';
      if (questoesCountEl) questoesCountEl.style.display = 'none';
      document.querySelectorAll('.top-bar .search').forEach(el => el.style.display = 'none');
      
      if(timerContainer) timerContainer.style.display = 'block';

      const filteredForQuiz = getFilteredBD(); 

      if(filteredForQuiz.length === 0){
        showToast('Nenhuma questão para os filtros atuais.', 'error');
        sairTreino(false); 
        return;
      }

      filteredForQuiz.sort(() => Math.random() - 0.5);

      let limit = 0;
      if(fQtdTreino) limit = parseInt(fQtdTreino.value) || 0;

      if (limit > 0 && limit < filteredForQuiz.length) {
          quizOrder = filteredForQuiz.slice(0, limit);
      } else {
          quizOrder = filteredForQuiz;
      }
      
      lista.classList.remove('list');
      lista.classList.add('quiz-container');

      inQuiz = true;
      quizIndex = 0;
      if(quizTimerEl) quizTimerEl.style.display = 'inline-block';
      startTimer();
      mostrarQuiz();
  } catch (err) {
      console.error(err);
      alert("Erro ao iniciar Quiz: " + err.message);
      sairTreino(false);
  }
}

function mostrarQuiz(){
  try {
      if(!inQuiz || quizOrder.length === 0) return;

      const q = quizOrder[quizIndex];
      const total = quizOrder.length;
      const current = quizIndex + 1;
      
      const resolucaoEl = document.getElementById('resultado');
      const quizActions = document.getElementById('quizActions');

      if(!q){
        stopTimer();
        lista.innerHTML = `<div class="card quiz-card" style="text-align: center;">
          <h3>Fim do Treino!</h3>
          <p>Você completou ${total} questões em ${quizTimerEl.textContent}.</p>
          <button onclick="sairTreino(false)" class="btn primary">Voltar ao Banco</button>
        </div>`;
        if(quizTimerEl) quizTimerEl.style.display = 'none';
        if(resolucaoEl) resolucaoEl.innerHTML = '';
        if(quizActions) quizActions.innerHTML = '';
        return;
      }

      const opcoes = [
        { letra: 'A', texto: q.A },
        { letra: 'B', texto: q.B },
        { letra: 'C', texto: q.C },
        { letra: 'D', texto: q.D },
        { letra: 'E', texto: q.E }
      ].filter(opt => opt.texto && opt.texto.trim() !== ""); 

      const contentHtml = renderEnunciadoWithImage(q.enunciado, q.imagem, true);

      lista.innerHTML = `
        <div class="card quiz-card">
          <p class="meta" style="margin-bottom: 5px;">
            Questão ${current}/${total}
          </p>
          <p class="meta" style="margin-bottom: 15px;">
            ${escapeHtml(q.disciplina || 'Geral')} — ${escapeHtml(q.banca || 'N/A')} (${escapeHtml(q.ano || 'Ano')})
            <br>
            <b>${escapeHtml(q.assunto || 'Diversos')}</b>
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
      
      if(resolucaoEl) resolucaoEl.innerHTML = '';
      if(quizActions) {
          quizActions.innerHTML = `
            <button id="btnSair" onclick="sairTreino()" class="btn secondary">Sair</button>
            <button id="btnPular" onclick="pularPergunta()" class="btn secondary" style="margin-left: 10px;">Pular</button>
          `;
      }
  } catch (err) {
      console.error(err);
      alert("Erro ao exibir questão: " + err.message);
      pularPergunta();
  }
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
      updateDailyGoal(1);
  }

  if (quizActions && !document.getElementById('btnVerResp')) {
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
  if(resolucaoEl) resolucaoEl.innerHTML = feedbackHTML + resolucao; 

  const quizActions = document.getElementById('quizActions');
  const btnVerResp = document.getElementById('btnVerResp');
  if(btnVerResp) btnVerResp.remove();

  if(quizActions) {
    quizActions.innerHTML += `
        <button id="btnProx" onclick="proximaPergunta()" class="btn primary" style="margin-left: 10px;">Próxima</button>
    `;
  }
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
  if(quizTimerEl) quizTimerEl.style.display = 'none';

  headerControls.style.display = 'flex';
  formContainer.style.display = 'none'; 
  
  document.querySelectorAll('.top-bar .search').forEach(el => el.style.display = 'flex');
  if(timerContainer) timerContainer.style.display = 'none';

  renderQuestions(); 
}

/* ---------------------------
   Exportação Global
----------------------------*/
window.editQ = editQ;
window.delQ = delQ;
window.copyQuestion = copyQuestion;
window.toggleRevisao = toggleRevisao;
window.filterByTag = filterByTag;
window.sairTreino = sairTreino;
window.checarResposta = checarResposta;
window.mostrarResolucao = mostrarResolucao;
window.proximaPergunta = proximaPergunta;
window.pularPergunta = pularPergunta;

/* ---------------------------
   Renderização e Filtros
----------------------------*/
function renderQuestions(){
  if(inQuiz) {
      if(questoesCountEl) questoesCountEl.style.display = 'none';
      if(paginationControls) paginationControls.style.display = 'none';
      return;
  }
  
  lista.classList.remove('quiz-container');
  lista.classList.add('list'); 
  
  const resEl = document.getElementById('resultado');
  const actEl = document.getElementById('quizActions');
  if(resEl) resEl.innerHTML = '';
  if(actEl) actEl.innerHTML = '';

  const filteredBD = getFilteredBD(); 
  const total = filteredBD.length;
  
  if (questoesCountEl) {
     questoesCountEl.style.display = 'block'; 
     questoesCountEl.innerHTML = `Total: <span style="color: var(--accent)">${total}</span> questões`;
  }

  if(total === 0){
    lista.innerHTML = `<p class="meta" style="text-align:center; padding: 20px;">Nenhuma questão encontrada.</p>`;
    if(paginationControls) paginationControls.style.display = 'none';
    return;
  }

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
       ? `<span class="stats-badge" title="${stats.correct} acertos / ${stats.wrong} erros">Tx: ${perc}% (${totalAttempts}x)</span>` 
       : '';

    const revClass = q.revisao ? 'active' : '';
    const revTitle = q.revisao ? 'Remover da Revisão' : 'Marcar para Revisão';
    
    let diffBadge = '';
    if(q.dificuldade) {
        let diffClass = 'diff-media';
        if(q.dificuldade === 'Fácil') diffClass = 'diff-facil';
        if(q.dificuldade === 'Difícil') diffClass = 'diff-dificil';
        diffBadge = `<span class="badge-diff ${diffClass}">${q.dificuldade}</span>`;
    }

    const contentHtml = renderEnunciadoWithImage(q.enunciado, q.imagem, false);
    
    const tagsHtml = (q.tags || "").split(',').filter(t => t.trim()).map(t => {
        const tagClean = escapeHtml(t.trim());
        return `<span class="tag" onclick="filterByTag('${tagClean.replace(/'/g, "\\'")}')">${tagClean}</span>`;
    }).join('');

    return `
    <div class="qitem" id="q-${q.id}">
      <div class="meta header-meta">
        <div>
            ${escapeHtml(q.disciplina || 'Disciplina')} — ${escapeHtml(q.banca || 'Banca')} (${escapeHtml(q.ano || 'Ano')})
            ${diffBadge}
            <br>
            <b>${escapeHtml(q.assunto)}</b> — ${escapeHtml(q.topico)}
        </div>
        <div style="text-align:right;">
            <button class="btn-icon ${revClass}" onclick="toggleRevisao(${q.id})" title="${revTitle}">🚩</button>
            <br>
            <small>Resp: <b>${escapeHtml(q.correta)}</b></small>
        </div>
      </div>

      <p style="margin: 8px 0;">${contentHtml}</p>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <div>
             ${tagsHtml}
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

  if(paginationControls) {
      paginationControls.style.display = totalPages > 1 ? 'flex' : 'none';
      pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
      btnPrevPage.disabled = currentPage === 1;
      btnNextPage.disabled = currentPage === totalPages;
  }
}

function updateFilterOptions() {
  const assuntos = [...new Set(BD.map(q => q.assunto).filter(a => a))].sort();
  const disciplinas = [...new Set(BD.map(q => q.disciplina).filter(a => a))].sort();
  const bancas = [...new Set(BD.map(q => q.banca).filter(a => a))].sort();
  const anos = [...new Set(BD.map(q => String(q.ano)).filter(a => a))].sort((a, b) => b - a);

  if(fAssunto) renderSelectOptions(fAssunto, "Todos os assuntos", assuntos, fAssunto.value);
  if(fDisciplina) renderSelectOptions(fDisciplina, "Todas as disciplinas", disciplinas, fDisciplina.value);
  if(fBanca) renderSelectOptions(fBanca, "Todas as bancas", bancas, fBanca.value);
  if(fAno) renderSelectOptions(fAno, "Todos os anos", anos, fAno.value);
}

function getFilteredBD() {
  const termo = fSearch ? fSearch.value.toLowerCase().trim() : '';
  const valAssunto = fAssunto ? fAssunto.value : '';
  const valAno = fAno ? fAno.value : '';
  const valBanca = fBanca ? fBanca.value : '';
  const valDisciplina = fDisciplina ? fDisciplina.value : '';
  const valRevisao = fRevisao ? fRevisao.checked : false;
  const valDificuldade = fDificuldade ? fDificuldade.value : ''; 

  return BD.filter(q => {
    const matchSearch = !termo || 
                        (q.enunciado||"").toLowerCase().includes(termo) ||
                        (q.assunto||"").toLowerCase().includes(termo) ||
                        (q.topico||"").toLowerCase().includes(termo) ||
                        (q.tags||"").toLowerCase().includes(termo);

    const matchAssunto = !valAssunto || q.assunto === valAssunto;
    const matchAno = !valAno || String(q.ano) === valAno;
    const matchBanca = !valBanca || q.banca === valBanca;
    const matchDisciplina = !valDisciplina || q.disciplina === valDisciplina;
    const matchRevisao = !valRevisao || q.revisao === true;
    const matchDificuldade = !valDificuldade || q.dificuldade === valDificuldade;
    
    return matchSearch && matchAssunto && matchAno && matchBanca && matchDisciplina && matchRevisao && matchDificuldade;
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
  renderQuestions();
}

/* ---------------------------
   Cadernos e Stats
----------------------------*/
function populateSavedFilters() {
    if(!savedFiltersSelect) return;
    savedFiltersSelect.innerHTML = `<option value="">📂 Meus Cadernos...</option>`;
    Object.keys(SAVED_FILTERS).forEach(name => {
        savedFiltersSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

function saveCurrentFilter() {
    const name = prompt("Dê um nome para este caderno:");
    if(!name) return;
    SAVED_FILTERS[name] = {
        assunto: fAssunto ? fAssunto.value : "",
        disciplina: fDisciplina ? fDisciplina.value : "",
        banca: fBanca ? fBanca.value : "",
        ano: fAno ? fAno.value : "",
        revisao: fRevisao ? fRevisao.checked : false,
        dificuldade: fDificuldade ? fDificuldade.value : ""
    };
    localStorage.setItem('BD_FILTROS', JSON.stringify(SAVED_FILTERS));
    populateSavedFilters();
    savedFiltersSelect.value = name;
    if(btnDeleteFilter) btnDeleteFilter.style.display = 'inline-block';
    showToast(`Caderno "${name}" salvo!`, 'success');
}

function loadSavedFilter() {
    if(!savedFiltersSelect) return;
    const name = savedFiltersSelect.value;
    if(!name) {
        if(btnDeleteFilter) btnDeleteFilter.style.display = 'none';
        return;
    }
    const saved = SAVED_FILTERS[name];
    if(saved) {
        if(fAssunto) fAssunto.value = saved.assunto || "";
        if(fDisciplina) fDisciplina.value = saved.disciplina || "";
        if(fBanca) fBanca.value = saved.banca || "";
        if(fAno) fAno.value = saved.ano || "";
        if(fRevisao) fRevisao.checked = saved.revisao || false;
        if(fDificuldade) fDificuldade.value = saved.dificuldade || "";
        if(btnDeleteFilter) btnDeleteFilter.style.display = 'inline-block';
        showToast(`Caderno "${name}" carregado.`, 'info');
        onFilterChange();
    }
}

function deleteFilter() {
    const name = savedFiltersSelect.value;
    if(!name) return;
    if(confirm(`Excluir o caderno "${name}"?`)) {
        delete SAVED_FILTERS[name];
        localStorage.setItem('BD_FILTROS', JSON.stringify(SAVED_FILTERS));
        populateSavedFilters();
        if(btnDeleteFilter) btnDeleteFilter.style.display = 'none';
        showToast('Caderno excluído.', 'info');
    }
}

if(btnSaveFilter) btnSaveFilter.addEventListener('click', saveCurrentFilter);
if(savedFiltersSelect) savedFiltersSelect.addEventListener('change', loadSavedFilter);
if(btnDeleteFilter) btnDeleteFilter.addEventListener('click', deleteFilter);

function initDailyGoal() {
    const today = new Date().toLocaleDateString();
    if (DAILY_GOAL.date !== today) {
        DAILY_GOAL = { date: today, count: 0, target: 20 };
        localStorage.setItem('BD_DAILY_GOAL', JSON.stringify(DAILY_GOAL));
    }
    updateDailyGoalUI();
}

function updateDailyGoal(increment = 1) {
    const today = new Date().toLocaleDateString();
    if (DAILY_GOAL.date !== today) {
        DAILY_GOAL.count = 0;
        DAILY_GOAL.date = today;
    }
    DAILY_GOAL.count += increment;
    localStorage.setItem('BD_DAILY_GOAL', JSON.stringify(DAILY_GOAL));
    updateDailyGoalUI();
    if(DAILY_GOAL.count === DAILY_GOAL.target) {
        showToast("🎉 Parabéns! Meta diária batida!", "success");
    }
}

function updateDailyGoalUI() {
    if(!goalBarFill || !goalText) return; 
    const perc = Math.min((DAILY_GOAL.count / DAILY_GOAL.target) * 100, 100);
    goalBarFill.style.width = `${perc}%`;
    goalText.textContent = `${DAILY_GOAL.count}/${DAILY_GOAL.target}`;
    if(perc >= 100) goalBarFill.style.background = 'var(--success)';
}

function showStats() {
    let total = BD.length;
    let resolv = BD.reduce((acc, q) => acc + (q.stats ? (q.stats.correct+q.stats.wrong) : 0), 0);
    let html = `<p>Total Questões: ${total}</p><p>Resoluções: ${resolv}</p>`;
    if(statsBody) statsBody.innerHTML = html;
    if(statsModal) statsModal.showModal();
}
if(btnStats) btnStats.addEventListener('click', showStats);
if(btnCloseStats) btnCloseStats.addEventListener('click', () => statsModal.close());

/* ---------------------------
   CRUD e Imagem
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
    dificuldade: document.getElementById('dificuldade') ? document.getElementById('dificuldade').value : "",
    imagem: null
  };
  const currentImg = document.getElementById('imgPreview').src;
  if(document.getElementById('imgPreview').style.display !== 'none') {
      novaQuestao.imagem = currentImg;
  }

  if(!novaQuestao.enunciado || !novaQuestao.correta || !novaQuestao.assunto){
    showToast("Preencha Enunciado, Assunto e Resposta.", "error"); 
    return;
  }

  if(id){
    const index = BD.findIndex(q => q.id == id);
    if(index !== -1){
      BD[index] = { ...BD[index], ...novaQuestao, stats: BD[index].stats || {correct:0, wrong:0}, revisao: BD[index].revisao || false };
    }
  } else {
    novaQuestao.id = Date.now(); 
    novaQuestao.stats = { correct: 0, wrong: 0 };
    novaQuestao.revisao = false;
    BD.push(novaQuestao);
    questionsSinceBackup++;
    if(questionsSinceBackup >= 20) {
        alert("Lembrete: Faça backup clicando em Exportar!");
        questionsSinceBackup = 0;
    }
  }
  saveBD();
  showToast("Salvo!", "success");
  fecharFormulario(); 
  updateFilterOptions(); 
  renderQuestions();
}

function clearForm(){
  form.reset();
  document.getElementById('qid').value = '';
  if(imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
  if(btnRemoverImg) btnRemoverImg.style.display = 'none';
}

function editQ(id){
  const q = BD.find(x => x.id == id);
  if(!q) return;

  // --- CORREÇÃO: Abre e LIMPA antes de preencher ---
  abrirFormulario(); 

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
  if(document.getElementById('dificuldade')) document.getElementById('dificuldade').value = q.dificuldade || "";

  if(q.imagem) {
      if(imgPreview) { imgPreview.src = q.imagem; imgPreview.style.display = 'block'; }
      if(btnRemoverImg) btnRemoverImg.style.display = 'inline-block';
  } else {
      if(imgPreview) imgPreview.style.display = 'none';
      if(btnRemoverImg) btnRemoverImg.style.display = 'none';
  }
}

function delQ(id){
  if(!confirm('Excluir?')) return;
  BD = BD.filter(q => q.id != id);
  saveBD();
  showToast("Excluída.", "info");
  renderQuestions();
  updateFilterOptions();
}

function toggleRevisao(id) {
    const index = BD.findIndex(q => q.id == id);
    if(index !== -1) {
        BD[index].revisao = !BD[index].revisao;
        saveBD();
        renderQuestions();
    }
}

function copyQuestion(id){
  const q = BD.find(x => x.id == id);
  if(!q) return;
  const text = `${q.enunciado}\n\nA) ${q.A}\nB) ${q.B}\nC) ${q.C}\nD) ${q.D}\nE) ${q.E}\n\nResp: ${q.correta}`;
  navigator.clipboard.writeText(text).then(() => showToast('Copiado!', 'success'));
}

function filterByTag(tagName) {
    if(fSearch) { fSearch.value = tagName; renderQuestions(); }
}

function abrirFormulario() { clearForm(); formContainer.style.display = 'block'; formContainer.scrollIntoView(); }
function fecharFormulario() { formContainer.style.display = 'none'; clearForm(); }

if(inpImagem) {
    inpImagem.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let width = img.width, height = img.height;
          const MAX = 800;
          if (width > height && width > MAX) { height *= MAX/width; width = MAX; }
          else if (height > MAX) { width *= MAX/height; height = MAX; }
          canvas.width = width; canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          imgPreview.src = canvas.toDataURL('image/jpeg', 0.7);
          imgPreview.style.display = 'block';
          if(btnRemoverImg) btnRemoverImg.style.display = 'inline-block';
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
}
if(btnRemoverImg) btnRemoverImg.addEventListener('click', () => { inpImagem.value=''; imgPreview.style.display='none'; btnRemoverImg.style.display='none'; });
if(btnInsertImgTag) btnInsertImgTag.addEventListener('click', () => { txtEnunciado.value += " [IMAGEM] "; });

function exportDB(){
  const dataStr = JSON.stringify(BD, null, 2);
  const link = document.createElement('a');
  link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  link.download = `bkp_${new Date().toISOString().slice(0,10)}.json`;
  link.click();
}
function importDB(){ fileInput.click(); }
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
      try {
          const json = JSON.parse(event.target.result);
          if(Array.isArray(json)) { BD = json; saveBD(); init(); showToast('Importado!', 'success'); }
      } catch(e) { alert("Erro ao importar JSON."); }
  };
  reader.readAsText(file);
});
function clearDB(){ if(confirm('Apagar tudo?')) { BD=[]; saveBD(); init(); } }

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
if(fDificuldade) fDificuldade.addEventListener('change', onFilterChange); 
themeToggle.addEventListener('click', toggleTheme); 
btnPrevPage.addEventListener('click', () => { if(currentPage>1){currentPage--; renderQuestions(); lista.scrollTop=0;} });
btnNextPage.addEventListener('click', () => { currentPage++; renderQuestions(); lista.scrollTop=0; });

function loadTheme() { document.body.className = (localStorage.getItem('theme')||'dark')+'-mode'; }
function toggleTheme() { 
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    document.body.className = newTheme+'-mode';
    localStorage.setItem('theme', newTheme);
}

function init(){
  loadTheme(); 
  initDailyGoal(); 
  populateSavedFilters();
  migrateOldQuestions(); 
  updateFilterOptions();
  renderQuestions();
}

init();