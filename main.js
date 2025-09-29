document.addEventListener('DOMContentLoaded', () => {
  // Contador regressivo - seleciona os elementos do DOM para dias, horas, minutos e segundos
  const $d = document.getElementById('d'); // Dias 
  const $h = document.getElementById('h'); // Horas 
  const $m = document.getElementById('m'); // Minutos 
  const $s = document.getElementById('s'); // Segundos 

  // Verifica se todos os elementos existem antes de continuar
  if ($d && $h && $m && $s) {
    // Constantes para conversão de tempo em milissegundos
    const MS = { sec: 1000, min: 60000, hour: 3600000, day: 86400000 }; 
    // Fuso horário de São Paulo (BRT)
    const BRT_TZ = 'America/Sao_Paulo';

    // Função para adicionar zero à esquerda em números menores que 10
    const pad = n => String(n).padStart(2, '0');

    // Função que retorna as partes da data formatadas no fuso horário BRT
    const brtParts = (date = new Date()) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: BRT_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', 
        hour12: false, weekday: 'short',
      }).formatToParts(date).reduce((acc, { type, value }) => { 
        acc[type] = value;
        return acc;
      }, {});
      return parts;
    };

    // Função que calcula a próxima quarta-feira às 20h no horário BRT
    const nextWednesday20BRT = () => {
      // Mapeia os dias da semana para índices numéricos
      const wdIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const p = brtParts();
      const todayIdx = wdIndex[p.weekday];
      // Calcula quantos dias faltam para a próxima quarta-feira
      let daysAhead = (3 - todayIdx + 7) % 7;
      // Verifica se já passou das 20h na quarta-feira atual
      const passed20 = Number(p.hour) > 20 || (Number(p.hour) === 20 && (Number(p.minute) > 0 || Number(p.second) > 0));
      // Se já passou das 20h na quarta-feira, agenda para a próxima semana
      if (todayIdx === 3 && passed20) daysAhead = 7;
      // Cria uma data base no fuso BRT à meia-noite do dia atual
      const baseISO = `${p.year}-${p.month}-${p.day}T00:00:00-03:00`;
      const base = new Date(baseISO);
      // Retorna a data da próxima quarta-feira às 20h
      return new Date(base.getTime() + daysAhead * MS.day + 20 * MS.hour);
    };

    // Define o alvo inicial do contador regressivo
    let target = nextWednesday20BRT();

    // Função que atualiza o contador regressivo a cada segundo
    const tick = () => {
      let diff = target - new Date();
      // Se o tempo acabou, recalcula o próximo alvo
      if (diff <= 0) {
        target = nextWednesday20BRT();
        diff = target - new Date();
      }
      // Calcula dias, horas, minutos e segundos restantes
      const days = Math.floor(diff / MS.day);
      const hours = Math.floor((diff % MS.day) / MS.hour);
      const mins = Math.floor((diff % MS.hour) / MS.min);
      const secs = Math.floor((diff % MS.min) / MS.sec);

      // Atualiza o conteúdo dos elementos no DOM com valores formatados
      $d.textContent = pad(days);
      $h.textContent = pad(hours);
      $m.textContent = pad(mins);
      $s.textContent = pad(secs);
    };

    // Executa o tick imediatamente e depois a cada segundo
    tick();
    setInterval(tick, 1000);
  }

  // Formulário - seleciona o formulário e seus campos
  const form = document.getElementById('leadForm');
  if (!form) return; // Sai se o formulário não existir

  const btn = document.getElementById('cta');
  const nomeEl = document.getElementById('nome');
  const emailEl = document.getElementById('email');
  const telEl = document.getElementById('tel');

  // URL do endpoint para envio dos leads
  const ENDPOINT = 'https://cbs.herbertcarnauba.com.br/api/leads';
  // URL do grupo do WhatsApp para redirecionamento
  const WHATSAPP_URL = 'https://chat.whatsapp.com/EJjYwzRiCA85e9yrEwi8uV?mode=ems_wa_t';

  // Função para obter valor de cookie pelo nome
  const getCookie = name => {
    const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[2]) : null;
  };

  // Função para obter cookie _fbp (Facebook Pixel)
  const getFbp = () => getCookie('_fbp') || undefined;

  // Função para obter cookie _fbc ou construir a partir do parâmetro fbclid da URL
  const getFbc = () => {
    const existing = getCookie('_fbc');
    if (existing) return existing;
    const fbclid = new URL(window.location.href).searchParams.get('fbclid');
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
  };

  // Regex para validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Função para formatar telefone no padrão brasileiro (com DDD)
  const formatPhone = v => {
    const digits = (v || '').replace(/\D/g, '');
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  // Função para validar os campos do formulário
  const validate = (name, email, telefone) => {
    if (!name) return 'Preencha seu nome.';
    if (name.trim().length < 2) return 'Nome muito curto.';
    if (!email) return 'Preencha seu email.';
    if (!emailRegex.test(email)) return 'Email inválido.';
    const digits = (telefone || '').replace(/\D/g, '');
    if (!digits) return 'Preencha seu telefone.';
    if (digits.length < 10 || digits.length > 11) return 'Telefone deve ter 10 ou 11 dígitos.';
    return '';
  };

  // Adiciona listener para formatar telefone enquanto o usuário digita
  if (telEl) {
    telEl.addEventListener('input', e => {
      const caret = e.target.selectionStart || 0;
      const before = e.target.value;
      e.target.value = formatPhone(e.target.value);
      // Ajusta a posição do cursor após formatação
      const diff = e.target.value.length - before.length;
      const pos = Math.max(0, caret + (diff > 0 ? diff : 0));
      e.target.setSelectionRange(pos, pos);
    });
  }

  // Função para converter objeto em query string para URL
  const toParams = obj => {
    const params = new URLSearchParams();
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
        params.append(k, String(obj[k]));
      }
    }
    return params.toString();
  };

  // Listener para submissão do formulário
  form.addEventListener('submit', e => {
    e.preventDefault(); // Prevê o comportamento padrão de envio

    // Obtém e limpa os valores dos campos
    const nome = nomeEl?.value.trim() || '';
    const email = emailEl?.value.trim() || '';
    const telefone = telEl?.value.trim() || '';

    // Valida os dados do formulário
    const err = validate(nome, email, telefone);
    if (err) {
      alert(err); // Exibe mensagem de erro se houver
      return;
    }

    // Desabilita o botão para evitar múltiplos envios e altera a opacidade
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.7';
    }

    // Gera um ID único para o evento (usando crypto.randomUUID se disponível)
    const eventId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

    // Monta o payload para envio ao endpoint
    const payload = {
      nome,
      email,
      telefone,
      origem: 'landing-live',
      formData: { name: nome, email, phone: telefone },
      eventId,
      fbp: getFbp(),
      fbc: getFbc(),
    };

    // Envia os dados via fetch para o endpoint
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(resp => {
        // Se o Facebook Pixel estiver disponível, dispara o evento Lead
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Lead', { value: 0, currency: 'BRL' }, { eventID: eventId });
        }
        // Define se o envio foi bem-sucedido
        const saved = resp?.ok ? '1' : '0';
        // Monta query string para redirecionamento
        const qs = toParams({ g: WHATSAPP_URL, nome, email, telefone, saved, eventId });
        // Redireciona para página pendente com parâmetros
        window.location.href = `pendente/index.html?${qs}`;
      })
      .catch(() => {
        // Em caso de erro, monta query string com saved=0 e loga no console
        const qs = toParams({ g: WHATSAPP_URL, nome, email, telefone, saved: '0', eventId });
        console.log(qs);
      })
      .finally(() => {
        // Reabilita o botão e restaura a opacidade
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
  });
});
