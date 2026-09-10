// Core interactivity for kiosk UI
const state = {
  currentScreen: 'welcome',
  currentPatient: null,
  inactivityTimer: null,
  recognition: null,
};

const screens = {
  welcome: document.getElementById('screen-welcome'),
  dashboard: document.getElementById('screen-dashboard'),
  loading: document.getElementById('screen-loading'),
};

const display = document.getElementById('senha-input');
const scannerInput = document.getElementById('scanner-input');
const scannerStatus = document.getElementById('scanner-status');
const continueButton = document.querySelector('[data-action="consultar"]');
const clockEl = document.getElementById('clock');
const chatStatus = document.getElementById('chat-status');
const chatVoiceButton = document.getElementById('chat-voice');
const chatQuestionEl = document.getElementById('chat-question');

function updateClock(){
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}

function setActiveScreen(name){
  Object.keys(screens).forEach(k=>{
    const s = screens[k]; if(!s) return; s.classList.toggle('screen-active', k===name); s.classList.toggle('screen-hidden', k!==name);
  });
  state.currentScreen = name;
}

function startInactivityTimer(){
  clearTimeout(state.inactivityTimer);
  state.inactivityTimer = setTimeout(()=>{ resetFlow(); }, 60000);
}

function resetFlow(){
  state.currentPatient = null;
  if(display) display.textContent = 'Sua Senha';
  if(scannerInput) scannerInput.value = '';
  if(scannerStatus) scannerStatus.textContent = 'Aguardando leitura';
  // reset dashboard fields safely
  const ids = ['medical-patient-name','medical-risk-badge','medical-code','medical-status','medical-position','medical-time','medical-notes','chat-ai-message','chat-question','chat-response-text','queue-position','queue-ahead','queue-time','queue-status'];
  ids.forEach(id=>{ const el=document.getElementById(id); if(!el) return; if(el.tagName==='INPUT' || el.tagName==='TEXTAREA') el.value=''; else el.textContent='--'; });
  const notes = document.getElementById('medical-notes'); if(notes) notes.textContent='Nenhuma anotação até o momento. Converse com o assistente para gerar anotações.';
  const chatResponse = document.getElementById('chat-response'); if(chatResponse) chatResponse.style.display='none';
  if(chatStatus) chatStatus.textContent='Fale ou digite sua pergunta e o assistente responderá.';
  setActiveScreen('welcome');
  startInactivityTimer();
}

function handleInputValue(value){ if(!display) return; display.textContent = value? value.toUpperCase() : 'Digite sua senha'; }
function handleScannerValue(value){
  const code = (value || '').trim().toUpperCase();
  if(display) display.textContent = code || 'Aguardando leitura';
  if(scannerStatus) scannerStatus.textContent = code ? 'Senha identificada' : 'Aguardando leitura';
  startInactivityTimer();
}
function appendDigit(d){ const cur = (display && display.textContent && display.textContent!=='Sua Senha' && display.textContent!=='Digite sua senha')? display.textContent : ''; const next = (cur + d).trim(); if(next.length>9) return; handleInputValue(next); startInactivityTimer(); }
function clearInput(){ handleInputValue(''); startInactivityTimer(); }

async function consultarSenha(){
  const senha = scannerInput && scannerInput.value.trim() ? scannerInput.value.trim().toUpperCase() : 'VD-104';
  if(scannerInput && !scannerInput.value.trim()){
    scannerInput.value = senha;
    handleScannerValue(senha);
  }
  setActiveScreen('loading'); startInactivityTimer();
  try{
    const resp = await fetch('/api/consultar-senha',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({senha}) });
    const data = await resp.json();
    if(!resp.ok || !data.ok) throw new Error(data.message||'Erro ao consultar');
    const paciente = data.paciente;
    state.currentPatient = paciente;
    document.getElementById('medical-patient-name').textContent = paciente.nome || '--';
    const badge = document.getElementById('medical-risk-badge'); if(badge){ badge.textContent = paciente.classificacao_risco || '--'; badge.style.background = paciente.cor_hex || ''; }
    document.getElementById('medical-code').textContent = paciente.senha || '--';
    document.getElementById('medical-status').textContent = paciente.status_atual || '--';
    document.getElementById('medical-position').textContent = paciente.posicao_fila ? `#${paciente.posicao_fila}` : '--';
    document.getElementById('medical-time').textContent = (paciente.tempo_estimado_minutos? paciente.tempo_estimado_minutos+' min' : '--');
    document.getElementById('queue-position').textContent = paciente.posicao_fila || '--';
    document.getElementById('queue-ahead').textContent = paciente.posicao_fila? Math.max(0,paciente.posicao_fila-1) : '--';
    document.getElementById('queue-time').textContent = (paciente.tempo_estimado_minutos? paciente.tempo_estimado_minutos+' min' : '--');
    document.getElementById('queue-status').textContent = paciente.status_atual || '--';
    document.getElementById('chat-ai-message').textContent = data.mensagem_acolhimento || 'Olá!';
    setActiveScreen('dashboard'); initTabNavigation(); startInactivityTimer();
  }catch(err){ alert(err.message||'Erro ao consultar a senha.'); setActiveScreen('welcome'); }
}

function initTabNavigation(){
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tab = btn.getAttribute('data-tab');
      tabButtons.forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById('tab-'+tab);
      if(target) target.classList.add('active');
      startInactivityTimer();
    });
  });
}

async function sendChatQuestion(){
  const question = chatQuestionEl? chatQuestionEl.value.trim() : '';
  if(!question){ alert('Fale ou digite sua pergunta antes de enviar.'); return; }
  if(!state.currentPatient){ alert('Paciente não identificado.'); return; }
  setActiveScreen('loading'); startInactivityTimer();
  try{
    const resp = await fetch('/api/tirar-duvida',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ senha: state.currentPatient.senha, duvida: question }) });
    const data = await resp.json(); if(!resp.ok || !data.ok) throw new Error(data.message||'Erro');
    const responseText = data.mensagem_acolhimento || 'Resposta não disponível.';
    const responseBox = document.getElementById('chat-response'); const responseTextEl = document.getElementById('chat-response-text');
    if(responseTextEl) responseTextEl.textContent = responseText; if(responseBox) responseBox.style.display='block';
    const notes = document.getElementById('medical-notes'); if(notes) notes.innerHTML += `<p><strong>P:</strong> ${escapeHtml(question)}</p><p><strong>R:</strong> ${escapeHtml(responseText)}</p><hr>`;
    if(chatQuestionEl) chatQuestionEl.value='';
    setActiveScreen('dashboard'); startInactivityTimer();
  }catch(err){ alert(err.message||'Erro ao buscar resposta.'); setActiveScreen('dashboard'); }
}

function escapeHtml(s){ return (s||'').replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function bindEvents(){
  document.querySelectorAll('[data-digit]').forEach(btn=>btn.addEventListener('click', ()=>appendDigit(btn.dataset.digit)));
  document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click', ()=>{ if(btn.dataset.action==='clear') clearInput(); if(btn.dataset.action==='consultar') consultarSenha(); }));
  document.querySelectorAll('[data-senha]').forEach(btn=>btn.addEventListener('click', ()=>{ handleInputValue(btn.dataset.senha); startInactivityTimer(); }));
  if(scannerInput){
    scannerInput.addEventListener('input', ()=>handleScannerValue(scannerInput.value));
    scannerInput.addEventListener('keydown', event=>{ if(event.key==='Enter'){ event.preventDefault(); scannerInput.blur(); } });
  }

  const sendBtn = document.getElementById('chat-send'); if(sendBtn) sendBtn.addEventListener('click', sendChatQuestion);
  const chatQ = document.getElementById('chat-question'); if(chatQ) chatQ.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendChatQuestion(); } });

  const logout = document.getElementById('logout-btn'); if(logout) logout.addEventListener('click', ()=>{ resetFlow(); });

  document.body.addEventListener('click', ()=> startInactivityTimer());
}

function initChatVoice(){
  if(!chatVoiceButton || !chatQuestionEl) return;
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognitionCtor){ chatVoiceButton.disabled=true; if(chatStatus) chatStatus.textContent='Reconhecimento de voz indisponível.'; return; }
  const rec = new SpeechRecognitionCtor(); rec.lang='pt-BR'; rec.interimResults=false; rec.maxAlternatives=1;
  rec.onstart = ()=>{ chatVoiceButton.classList.add('is-listening'); chatVoiceButton.setAttribute('aria-label','Parar gravação'); chatVoiceButton.title='Parar gravação'; if(chatStatus) chatStatus.textContent='Estou ouvindo...'; };
  rec.onresult = e=>{ const t = e.results[0][0].transcript; chatQuestionEl.value = t; if(chatStatus) chatStatus.textContent='Pergunta capturada.'; };
  rec.onerror = ()=>{ if(chatStatus) chatStatus.textContent='Erro no reconhecimento.'; };
  rec.onend = ()=>{ chatVoiceButton.classList.remove('is-listening'); chatVoiceButton.setAttribute('aria-label','Usar microfone'); chatVoiceButton.title='Falar sua pergunta'; };
  state.recognition = rec;
  chatVoiceButton.addEventListener('click', ()=>{ if(chatVoiceButton.classList.contains('is-listening')) state.recognition.stop(); else { chatQuestionEl.focus(); state.recognition.start(); } });
}

function init(){ updateClock(); setInterval(updateClock,30000); bindEvents(); initChatVoice(); startInactivityTimer(); }

init();
