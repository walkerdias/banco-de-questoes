// app.js — Versão 8.1 (Correção Estatísticas e Filtros)

"use strict";

// --- BOMBA DE CACHE ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}
// -----------------------

window.onload = function() {
    setTimeout(() => {
        showToast("✅ ATUALIZADO V8.1", "success");
    }, 500);
}

/* ---------------------------
   Referências DOM
----------------------------*/
// Modos
const btnModeQuestao = document.getElementById('btnModeQuestao');
const btnModeFlashcard = document.getElementById('btnModeFlashcard');
const sectionQuestoes = document.getElementById('sectionQuestoes');
const sectionFlashcards = document.getElementById('sectionFlashcards');

// Questões
const form = document.getElementById('form');
const lista = document.getElementById('lista');
const fSearch = document.getElementById('fSearch');
const quizTimerEl = document.getElementById('quizTimer');
const timerContainer = document.getElementById('timerContainer');
const fileInput = document.getElementById('fileInput');
const formContainer = document.getElementById('formCard'); 
const questoesCountEl = document.getElementById('questoesCount');
const headerControls = document.querySelector('header .controls'); 

// Filtros Questões
const fDisciplina = document.getElementById('fDisciplina');
const fAssunto = document.getElementById('fAssunto'); // Agora em cascata
const fAno = document.getElementById('fAno');
const fBanca = document.getElementById('fBanca');
const fRevisao = document.getElementById('fRevisao'); 
const fQtdTreino = document.getElementById('fQtdTreino');
const fDificuldade = document.getElementById('fDificuldade'); 

// Flashcards
const formFC = document.getElementById('formFC');
const formCardFC = document.getElementById('formCardFC');
const fcListContainer = document.getElementById('fcListContainer');
const listaFlashcards = document.getElementById('listaFlashcards');
const fcSearch = document.getElementById('fcSearch');
const fcCount = document.getElementById('fcCount');
// Filtros Flashcards
const fcDisciplinaFilter = document.getElementById('fcDisciplinaFilter');
const fcAssuntoFilter = document.getElementById('fcAssuntoFilter');

// Player Flashcard
const fcPlayer = document.getElementById('fcPlayer');
const fcCardElement = document.getElementById('fcCardElement');
const fcContentFront = document.getElementById('fcContentFront');
const fcContentBack = document.getElementById('fcContentBack');
const btnFcNext = document.getElementById('btnFcNext');
const btnFcPrev = document.getElementById('btnFcPrev');
const btnFcFlip = document.getElementById('btnFcFlip');
const btnFcExit = document.getElementById('btnFcExit');

// Cadernos e Meta
const savedFiltersSelect = document.getElementById('savedFilters');
const btnSaveFilter = document.getElementById('btnSaveFilter');
const btnDeleteFilter = document.getElementById('btnDeleteFilter');
const goalText = document.getElementById('goalText');
const goalBarFill = document.getElementById('goalBarFill');
const dailyGoalPanel = document.getElementById('dailyGoalPanel');

// Estatísticas
const btnStats = document.getElementById('btnStats');
const statsModal = document.getElementById('statsModal');
const btnCloseStats = document.getElementById('btnCloseStats');
const statsBody = document.getElementById('statsBody');

// Paginação e Imagem
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageInfo = document.getElementById('pageInfo');
const paginationControls = document.getElementById('paginationControls');
const inpImagem = document.getElementById('inpImagem');
const imgPreview = document.getElementById('imgPreview');
const btnRemoverImg = document.getElementById('btnRemoverImg');
const btnInsertImgTag = document.getElementById('btnInsertImgTag');
const txtEnunciado = document.getElementById('enunciado');

// Botões Gerais
const btnSalvar = document.getElementById('btnSalvar');
const btnCancelar = document.getElementById('btnCancelar');
const btnCancelarFC = document.getElementById('btnCancelarFC');
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
let BD_FC = JSON.parse(localStorage.getItem('BD_FLASHCARDS') || '[]');
let SAVED_FILTERS = JSON.parse(localStorage.getItem('BD_FILTROS') || '{}');
let DAILY_GOAL = JSON.parse(localStorage.getItem('BD_DAILY_GOAL') || '{"date": "", "count": 0, "target": 20}');

let currentMode = 'questoes'; 

// Quiz / Treino State
let inQuiz = false;
let quizIndex = 0;
let quizOrder = [];
let timerInterval = null;
let startTime = 0;

// Flashcard Player State
let fcIndex = 0;
let fcList = [];

let currentPage = 1;
const ITEMS_PER_PAGE = 20;
let questionsSinceBackup = 0;

/* ---------------------------
   Utilitários e Meta
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
    } catch(e) {
        if(e.name === 'QuotaExceededError') showToast("Erro: Limite cheio!", "error");
    }
}
function saveBD_FC(){ 
    try {
        localStorage.setItem('BD_FLASHCARDS', JSON.stringify(BD_FC)); 
    } catch(e) {
        showToast("Erro: Limite cheio!", "error");
    }
}
function escapeHtml(txt){ return String(txt||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n', '<br>'); }

function renderEnunciadoWithImage(enunciado, imagemBase64, isQuiz = false) {
    const safeText = escapeHtml(enunciado || ""); 
    if (!imagemBase64) return safeText;
    const imgClass = isQuiz ? "q-image quiz-image" : "q-image";
    const imgTag = `<img src="${imagemBase64}" class="${imgClass}" alt="Imagem">`;
    const placeHolder = '[IMAGEM]';
    return safeText.includes(placeHolder) ? safeText.replace(placeHolder, imgTag) : `${imgTag}<br>${safeText}`;
}

// --- META DIÁRIA ---
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
    if(DAILY_GOAL.count === DAILY_GOAL.target) showToast("🎉 Parabéns! Meta diária batida!", "success");
}

function updateDailyGoalUI() {
    if(!goalBarFill || !goalText) return; 
    const perc = Math.min((DAILY_GOAL.count / DAILY_GOAL.target) * 100, 100);
    goalBarFill.style.width = `${perc}%`;
    goalText.textContent = `${DAILY_GOAL.count}/${DAILY_GOAL.target}`;
    if(perc >= 100) {
        if(dailyGoalPanel) dailyGoalPanel.classList.add('goal-reached');
    } else {
        if(dailyGoalPanel) dailyGoalPanel.classList.remove('goal-reached');
    }
}

/* ---------------------------
   Gestão de Modos
----------------------------*/
function switchMode(mode) {
    currentMode = mode;
    
    // Reseta forms
    if(formContainer) formContainer.style.display = 'none';
    if(formCardFC) formCardFC.style.display = 'none';
    
    // Toggle Highlight dos Botões (CORRIGIDO)
    if(mode === 'questoes') {
        sectionQuestoes.style.display = 'block';
        sectionFlashcards.style.display = 'none';
        
        btnModeQuestao.className = 'btn primary mode-active';
        btnModeFlashcard.className = 'btn secondary'; // Remove estilo active
        
        if(btnQuiz) btnQuiz.textContent = "Modo Treino";
        if(dailyGoalPanel) dailyGoalPanel.style.display = 'block'; // Mostra meta
        
        updateFilterOptions(); // Carrega filtros de Questão
        renderQuestions();
    } 
    else if(mode === 'flashcards') {
        sectionQuestoes.style.display = 'none';
        sectionFlashcards.style.display = 'block';
        
        btnModeQuestao.className = 'btn secondary';
        btnModeFlashcard.className = 'btn primary mode-active'; // Adiciona estilo active
        
        if(btnQuiz) btnQuiz.textContent = "Estudar Flashcards";
        if(dailyGoalPanel) dailyGoalPanel.style.display = 'none'; // Esconde meta
        
        if(fcPlayer && fcPlayer.style.display === 'block') exitFlashcardStudy();
        
        updateFCFilters(); // Carrega filtros de FC
        renderFlashcardsList();
    }
}

if(btnModeQuestao) btnModeQuestao.addEventListener('click', () => switchMode('questoes'));
if(btnModeFlashcard) btnModeFlashcard.addEventListener('click', () => switchMode('flashcards'));

/* ---------------------------
   FILTROS CASCATA
----------------------------*/
// 1. Cascata para QUESTÕES
function updateFilterOptions() {
  // Preenche Disciplinas (sempre)
  const disciplinas = [...new Set(BD.map(q => q.disciplina).filter(a => a))].sort();
  // Se já tiver valor, mantém
  const currentDisc = fDisciplina.value;
  renderSelectOptions(fDisciplina, "Todas as disciplinas", disciplinas, currentDisc);
  
  // Atualiza Assuntos baseado na Disciplina selecionada
  updateAssuntoOptions(); 
  
  // Outros filtros estáticos
  const bancas = [...new Set(BD.map(q => q.banca).filter(a => a))].sort();
  const anos = [...new Set(BD.map(q => String(q.ano)).filter(a => a))].sort((a, b) => b - a);
  renderSelectOptions(fBanca, "Todas as bancas", bancas, fBanca.value);
  renderSelectOptions(fAno, "Todos os anos", anos, fAno.value);
}

function updateAssuntoOptions() {
    const selectedDisc = fDisciplina.value;
    let assuntos = [];

    if(selectedDisc) {
        // Apenas assuntos da disciplina selecionada
        assuntos = [...new Set(BD.filter(q => q.disciplina === selectedDisc).map(q => q.assunto).filter(a => a))].sort();
    } else {
        // Todos os assuntos se nenhuma disciplina selecionada
        assuntos = [...new Set(BD.map(q => q.assunto).filter(a => a))].sort();
    }
    renderSelectOptions(fAssunto, "Todos os assuntos", assuntos, fAssunto.value);
}

// 2. Cascata para FLASHCARDS
function updateFCFilters() {
    const disciplinas = [...new Set(BD_FC.map(f => f.disciplina).filter(d => d))].sort();
    const currentDisc = fcDisciplinaFilter.value;
    renderSelectOptions(fcDisciplinaFilter, "Todas as disciplinas", disciplinas, currentDisc);
    
    updateFCAssuntoOptions();
}

function updateFCAssuntoOptions() {
    const selectedDisc = fcDisciplinaFilter.value;
    let assuntos = [];
    
    if(selectedDisc) {
         assuntos = [...new Set(BD_FC.filter(f => f.disciplina === selectedDisc).map(f => f.assunto).filter(a => a))].sort();
    } else {
         assuntos = [...new Set(BD_FC.map(f => f.assunto).filter(a => a))].sort();
    }
    renderSelectOptions(fcAssuntoFilter, "Todos os assuntos", assuntos, fcAssuntoFilter.value);
}


function renderSelectOptions(selectEl, defaultText, optionsArray, currentValue) {
  // Guarda o valor atual para tentar restaurar após re-render
  const val = currentValue || selectEl.value;
  selectEl.innerHTML = `<option value="">${defaultText}</option>` + 
                       optionsArray.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
  if (val && optionsArray.includes(val)) {
      selectEl.value = val;
  } else {
      selectEl.value = "";
  }
}

// Event Listeners para Cascata
if(fDisciplina) fDisciplina.addEventListener('change', () => { 
    updateAssuntoOptions(); 
    currentPage = 1; 
    renderQuestions(); 
});
if(fcDisciplinaFilter) fcDisciplinaFilter.addEventListener('change', () => {
    updateFCAssuntoOptions();
    renderFlashcardsList();
});
if(fcAssuntoFilter) fcAssuntoFilter.addEventListener('change', renderFlashcardsList);


/* ---------------------------
   Flashcard Logic (Atualizada)
----------------------------*/
function renderFlashcardsList() {
    if(fcPlayer.style.display === 'block') return; 

    fcListContainer.style.display = 'block';
    
    const term = fcSearch ? fcSearch.value.toLowerCase().trim() : '';
    const fDisc = fcDisciplinaFilter ? fcDisciplinaFilter.value : '';
    const fAssu = fcAssuntoFilter ? fcAssuntoFilter.value : '';

    const filtered = BD_FC.filter(fc => {
        const matchSearch = (fc.assunto||"").toLowerCase().includes(term) ||
                            (fc.frente||"").toLowerCase().includes(term) ||
                            (fc.verso||"").toLowerCase().includes(term);
        const matchDisc = !fDisc || fc.disciplina === fDisc;
        const matchAssunto = !fAssu || fc.assunto === fAssu;
        
        return matchSearch && matchDisc && matchAssunto;
    });

    if(fcCount) fcCount.textContent = `Total: ${filtered.length} flashcards`;

    if(filtered.length === 0) {
        listaFlashcards.innerHTML = `<p class="meta" style="text-align:center; padding: 20px;">Nenhum flashcard encontrado.</p>`;
        return;
    }

    listaFlashcards.innerHTML = filtered.map(fc => `
        <div class="qitem" id="fc-${fc.id}">
            <div class="meta" style="margin-bottom:5px;">
                <span class="badge-diff diff-media" style="margin:0; font-size:0.7rem;">${escapeHtml(fc.disciplina || 'Geral')}</span>
                ${escapeHtml(fc.assunto || 'Sem Título')}
            </div>
            <p style="font-weight:500; margin-bottom:10px;">${escapeHtml(fc.frente)}</p>
            <div class="actions">
                <button onclick="editFC(${fc.id})" class="btn secondary">Editar</button>
                <button onclick="delFC(${fc.id})" class="btn secondary" style="background: var(--danger)">Excluir</button>
            </div>
        </div>
    `).join('');
}

function openFCForm() {
    formFC.reset();
    document.getElementById('fcId').value = '';
    formCardFC.style.display = 'block';
    formCardFC.scrollIntoView();
    formContainer.style.display = 'none';
}

function saveFC(e) {
    e.preventDefault();
    const id = document.getElementById('fcId').value;
    const disciplina = document.getElementById('fcDisciplina').value.trim(); 
    const assunto = document.getElementById('fcAssunto').value.trim(); 
    const frente = document.getElementById('fcFrente').value.trim();
    const verso = document.getElementById('fcVerso').value.trim();

    if(!frente || !verso) {
        showToast("Preencha Frente e Verso.", "error");
        return;
    }

    const novoFC = { 
        disciplina: disciplina || "Geral", 
        assunto: assunto || "Sem Título", // Mapeia para assunto
        frente, 
        verso 
    };

    if(id) {
        const index = BD_FC.findIndex(f => f.id == id);
        if(index !== -1) {
            BD_FC[index] = { ...BD_FC[index], ...novoFC };
        }
    } else {
        novoFC.id = Date.now();
        BD_FC.push(novoFC);
    }
    saveBD_FC();
    showToast("Flashcard salvo!", "success");
    formCardFC.style.display = 'none';
    updateFCFilters();
    renderFlashcardsList();
}

window.editFC = function(id) {
    const fc = BD_FC.find(f => f.id == id);
    if(!fc) return;
    openFCForm();
    document.getElementById('fcId').value = fc.id;
    document.getElementById('fcDisciplina').value = fc.disciplina || "";
    document.getElementById('fcAssunto').value = fc.assunto || fc.titulo || ""; 
    document.getElementById('fcFrente').value = fc.frente;
    document.getElementById('fcVerso').value = fc.verso;
};

window.delFC = function(id) {
    if(!confirm('Excluir este Flashcard?')) return;
    BD_FC = BD_FC.filter(f => f.id != id);
    saveBD_FC();
    updateFCFilters();
    renderFlashcardsList();
};

if(formFC) formFC.addEventListener('submit', saveFC);
if(btnCancelarFC) btnCancelarFC.addEventListener('click', () => formCardFC.style.display = 'none');
if(fcSearch) fcSearch.addEventListener('input', renderFlashcardsList);

// Estudo / Player Flashcard
function startFlashcardStudy() {
    if(BD_FC.length === 0) {
        showToast("Crie flashcards primeiro.", "error");
        return;
    }

    // Usa os filtros atuais para o estudo
    const term = fcSearch ? fcSearch.value.toLowerCase().trim() : '';
    const fDisc = fcDisciplinaFilter ? fcDisciplinaFilter.value : '';
    const fAssu = fcAssuntoFilter ? fcAssuntoFilter.value : '';

    fcList = BD_FC.filter(fc => {
        const matchSearch = (fc.assunto||"").toLowerCase().includes(term) ||
                            (fc.frente||"").toLowerCase().includes(term);
        const matchDisc = !fDisc || fc.disciplina === fDisc;
        const matchAssunto = !fAssu || fc.assunto === fAssu;
        return matchSearch && matchDisc && matchAssunto;
    });

    if(fcList.length === 0) {
        showToast("Nenhum flashcard neste filtro.", "error");
        return;
    }

    fcList.sort(() => Math.random() - 0.5);

    fcIndex = 0;
    
    fcListContainer.style.display = 'none';
    fcPlayer.style.display = 'block';
    if(headerControls) headerControls.style.display = 'none'; 
    
    showFlashcard(0);
}

function showFlashcard(index) {
    if(index < 0) index = 0;
    if(index >= fcList.length) index = fcList.length - 1;
    fcIndex = index;

    const fc = fcList[fcIndex];
    fcContentFront.textContent = fc.frente;
    fcContentBack.textContent = fc.verso;
    
    fcCardElement.classList.remove('is-flipped');
}

function flipCard() { fcCardElement.classList.toggle('is-flipped'); }
function nextCard() {
    if(fcIndex < fcList.length - 1) {
        if(fcCardElement.classList.contains('is-flipped')){
             fcCardElement.classList.remove('is-flipped');
             setTimeout(() => showFlashcard(fcIndex + 1), 300);
        } else { showFlashcard(fcIndex + 1); }
    } else { showToast("Fim da pilha!", "success"); }
}
function prevCard() {
    if(fcIndex > 0) {
        if(fcCardElement.classList.contains('is-flipped')){
            fcCardElement.classList.remove('is-flipped');
            setTimeout(() => showFlashcard(fcIndex - 1), 300);
       } else { showFlashcard(fcIndex - 1); }
    }
}
function exitFlashcardStudy() {
    fcPlayer.style.display = 'none';
    fcListContainer.style.display = 'block';
    if(headerControls) headerControls.style.display = 'flex';
}

if(fcCardElement) fcCardElement.addEventListener('click', flipCard);
if(btnFcFlip) btnFcFlip.addEventListener('click', flipCard);
if(btnFcNext) btnFcNext.addEventListener('click', (e) => { e.stopPropagation(); nextCard(); });
if(btnFcPrev) btnFcPrev.addEventListener('click', (e) => { e.stopPropagation(); prevCard(); });
if(btnFcExit) btnFcExit.addEventListener('click', exitFlashcardStudy);


/* ---------------------------
   CRUD e Imagem (Questões)
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

  if(currentMode !== 'questoes') switchMode('questoes');

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

function toggleRevisao(id, isQuiz = false) {
    const index = BD.findIndex(q => q.id == id);
    if(index !== -1) {
        BD[index].revisao = !BD[index].revisao;
        saveBD();
        
        if(isQuiz){
            const btn = document.getElementById(`btnQuizRev-${id}`);
            if(btn) btn.classList.toggle('active');
        } else {
            renderQuestions();
        }
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

function abrirFormulario() { clearForm(); formContainer.style.display = 'block'; formContainer.scrollIntoView(); formCardFC.style.display = 'none'; }
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
  const backup = {
      questoes: BD,
      flashcards: BD_FC
  };
  const dataStr = JSON.stringify(backup, null, 2);
  const link = document.createElement('a');
  link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  link.download = `backup_completo_${new Date().toISOString().slice(0,10)}.json`;
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
          
          if(Array.isArray(json)) {
              BD = json; 
              saveBD();
              showToast('Questões Importadas (Formato Antigo)!', 'success');
          } else if(json.questoes && json.flashcards) {
              BD = json.questoes || [];
              BD_FC = json.flashcards || [];
              saveBD();
              saveBD_FC();
              showToast('Backup Completo Restaurado!', 'success');
          } else {
             alert("Formato desconhecido.");
             return;
          }
          
          updateFilterOptions();
          updateFCFilters();
          renderQuestions();
      } catch(e) { alert("Erro ao importar JSON."); }
  };
  reader.readAsText(file);
});

function clearDB(){ 
    if(confirm('ATENÇÃO: Isso apagará TODAS as questões e flashcards. Confirmar?')) { 
        BD=[]; 
        BD_FC=[];
        saveBD(); 
        saveBD_FC();
        updateFilterOptions();
        updateFCFilters();
        renderQuestions();
        renderFlashcardsList();
    } 
}


/* ---------------------------
   QUIZ E TIMER
----------------------------*/
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

function initQuiz(){
  try {
      if(BD.length === 0){
        showToast('Adicione questões primeiro.', 'error');
        return;
      }
      
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
      const revClass = q.revisao ? 'active' : '';

      lista.innerHTML = `
        <div class="card quiz-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">
             <p class="meta" style="margin:0;">Questão ${current}/${total}</p>
             <button id="btnQuizRev-${q.id}" class="btn-icon ${revClass}" onclick="toggleRevisao(${q.id}, true)" title="Marcar para Revisão">🚩</button>
          </div>
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
   Função de Filtro Global (Questões)
----------------------------*/
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

      <p style="margin: 8px 0;">${renderEnunciadoWithImage(q.enunciado, q.imagem, false)}</p>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <div>
             ${(q.tags || "").split(',').filter(t => t.trim()).map(t => `<span class="tag" onclick="filterByTag('${escapeHtml(t.trim()).replace(/'/g, "\\'")}')">${escapeHtml(t.trim())}</span>`).join('')}
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

// Cadernos e Backup
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


// Estatísticas
function showStats() {
    const totalQuestions = BD.length;
    let totalAttempts = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let uniqueAnswered = 0;

    const discMap = {};

    BD.forEach(q => {
        if(q.stats) {
            const c = q.stats.correct || 0;
            const w = q.stats.wrong || 0;
            const t = c + w;
            
            if(t > 0) {
                uniqueAnswered++;
                totalCorrect += c;
                totalWrong += w;
                totalAttempts += t;

                const disc = q.disciplina ? q.disciplina.trim() : 'Sem Disciplina';
                if(!discMap[disc]) discMap[disc] = { correct: 0, wrong: 0 };
                discMap[disc].correct += c;
                discMap[disc].wrong += w;
            }
        }
    });

    const accuracy = totalAttempts > 0 ? ((totalCorrect / totalAttempts) * 100).toFixed(1) : "0.0";
    const bankProgress = totalQuestions > 0 ? ((uniqueAnswered / totalQuestions) * 100).toFixed(1) : "0.0";

    let html = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Banco</h3>
                <div class="value">${totalQuestions}</div>
            </div>
             <div class="stat-card">
                <h3>Respondidas</h3>
                <div class="value" title="${uniqueAnswered} questões únicas">${uniqueAnswered}</div>
            </div>
             <div class="stat-card success">
                <h3>Acertos</h3>
                <div class="value">${totalCorrect}</div>
            </div>
             <div class="stat-card danger">
                <h3>Erros</h3>
                <div class="value">${totalWrong}</div>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span style="font-weight:bold; color:var(--text-primary)">Taxa de Acerto: ${accuracy}%</span>
            <span style="font-size:0.9rem; color:var(--text-muted)">Progresso do Banco: ${bankProgress}%</span>
        </div>
        <div style="background: var(--border); height: 12px; border-radius: 6px; overflow: hidden; display:flex; margin-bottom: 5px;">
            <div style="width: ${accuracy}%; background: var(--success); height: 100%;" title="Acertos"></div>
            <div style="width: ${100 - accuracy}%; background: var(--danger); height: 100%;" title="Erros"></div>
        </div>
    `;

    html += `<h3 class="stat-section-title">Desempenho por Disciplina</h3>`;
    const discArray = Object.keys(discMap).map(key => ({
        name: key,
        ...discMap[key],
        total: discMap[key].correct + discMap[key].wrong
    })).sort((a,b) => b.total - a.total);

    if(discArray.length === 0) {
        html += `<p style="text-align:center; color:var(--text-muted); padding: 20px;">Nenhuma questão respondida ainda.</p>`;
    } else {
        html += `<div class="stat-table-container"><table class="stat-table">
            <thead>
                <tr>
                    <th>Disciplina</th>
                    <th>Resoluções</th>
                    <th>C / E</th>
                    <th>% Acerto</th>
                </tr>
            </thead>
            <tbody>`;
        discArray.forEach(d => {
            const discAcc = ((d.correct / d.total) * 100).toFixed(0);
            const colorBar = discAcc >= 70 ? 'var(--success)' : (discAcc >= 40 ? 'var(--warning)' : 'var(--danger)');
            html += `<tr>
                    <td>${escapeHtml(d.name)}</td>
                    <td style="text-align:center;">${d.total}</td>
                    <td><span style="color:var(--success); font-weight:bold;">${d.correct}</span> / <span style="color:var(--danger); font-weight:bold;">${d.wrong}</span></td>
                    <td>
                        <div style="display:flex; align-items:center;">
                            <div class="mini-progress-track">
                                <div class="mini-progress-fill" style="width:${discAcc}%; background: ${colorBar};"></div>
                            </div>
                            <span>${discAcc}%</span>
                        </div>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
    }
    if(statsBody) statsBody.innerHTML = html;
    if(statsModal) statsModal.showModal();
}
if(btnStats) btnStats.addEventListener('click', showStats);
if(btnCloseStats) btnCloseStats.addEventListener('click', () => statsModal.close());

// Listeners finais
if(btnNovo) btnNovo.addEventListener('click', () => { currentMode === 'questoes' ? abrirFormulario() : openFCForm(); });
if(btnQuiz) btnQuiz.addEventListener('click', () => { currentMode === 'questoes' ? initQuiz() : startFlashcardStudy(); });
if(fSearch) fSearch.addEventListener('input', () => { currentPage = 1; renderQuestions(); });
if(fAssunto) fAssunto.addEventListener('change', () => { currentPage = 1; renderQuestions(); });
if(fAno) fAno.addEventListener('change', onFilterChange);
if(fBanca) fBanca.addEventListener('change', onFilterChange);
if(fRevisao) fRevisao.addEventListener('change', onFilterChange);
if(fDificuldade) fDificuldade.addEventListener('change', onFilterChange); 
if(btnPrevPage) btnPrevPage.addEventListener('click', () => { if(currentPage>1){currentPage--; renderQuestions(); lista.scrollTop=0;} });
if(btnNextPage) btnNextPage.addEventListener('click', () => { currentPage++; renderQuestions(); lista.scrollTop=0; });
if(btnExport) btnExport.addEventListener('click', exportDB);
if(btnImport) btnImport.addEventListener('click', importDB);
if(btnLimpar) btnLimpar.addEventListener('click', clearDB);
if(btnSalvar) btnSalvar.addEventListener('click', saveQuestion);
if(btnCancelar) btnCancelar.addEventListener('click', fecharFormulario);

// Exportações Globais
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

// Inicialização
function loadTheme() { document.body.className = (localStorage.getItem('theme')||'dark')+'-mode'; }
function toggleTheme() { 
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    document.body.className = newTheme+'-mode';
    localStorage.setItem('theme', newTheme);
}
if(themeToggle) themeToggle.addEventListener('click', toggleTheme); 

function migrateOldQuestions() {
  let count = 0;
  BD.forEach(q => {
    if (!q.dificuldade || q.dificuldade === "") { q.dificuldade = 'Média'; count++; }
    if (!q.stats) q.stats = { correct: 0, wrong: 0 }; 
  });
  if (count > 0) saveBD();
}
function onFilterChange() { currentPage = 1; renderQuestions(); }

function init(){
  loadTheme(); 
  initDailyGoal(); 
  populateSavedFilters();
  migrateOldQuestions(); 
  updateFilterOptions();
  switchMode('questoes');
}
init();