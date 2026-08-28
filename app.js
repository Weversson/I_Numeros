const canvas = document.getElementById('draw-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const previewCanvas = document.getElementById('preview-canvas');
    const previewCtx = previewCanvas.getContext('2d');
    const canvasPlaceholder = document.getElementById('canvas-placeholder');

    const btnClear = document.getElementById('btn-clear');
    const btnUndo = document.getElementById('btn-undo');
    const toolPen = document.getElementById('tool-pen');
    const toolEraser = document.getElementById('tool-eraser');
    const heroDigit = document.getElementById('hero-digit');
    const verdictPill = document.getElementById('verdict-pill');
    const runnerupText = document.getElementById('runnerup-text');
    const barsList = document.getElementById('bars-list');
    const latencyText = document.getElementById('latency-text');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const strokeButtons = document.querySelectorAll('.btn-stroke');
    const sampleChips = document.querySelectorAll('.sample-chip');

    let modelo = null;
    let isDrawing = false;
    let hasDrawn = false;
    let currentStrokeWidth = 18;
    let currentTool = 'pen';
    let lastX = 0;
    let lastY = 0;
    let strokeHistory = [];

    // 1. Constrói a lista das 10 barras de probabilidades (0 a 9)
    function initBars() {
      barsList.innerHTML = '';
      for (let i = 0; i <= 9; i++) {
        const row = document.createElement('div');
        row.id = `row-${i}`;
        row.className = 'flex items-center gap-3 px-2 py-1 rounded-md transition-colors duration-150';
        row.innerHTML = `
          <div class="w-4 font-mono font-bold text-xs text-inkMuted text-center">${i}</div>
          <div class="flex-1 h-2.5 bg-paper rounded-full overflow-hidden border border-line p-[1px]">
            <div id="bar-${i}" class="bar-smooth h-full bg-slate-300 rounded-full w-0"></div>
          </div>
          <div id="val-${i}" class="w-12 text-right font-mono text-xs text-inkMuted font-medium">0.0%</div>
        `;
        barsList.appendChild(row);
      }
    }

    // Salva estado para Desfazer (Undo)
    function saveCanvasState() {
      strokeHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (strokeHistory.length > 25) strokeHistory.shift();
    }

    // 2. Configura o Canvas de Desenho
    function setupCanvas() {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = currentStrokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = Math.round(clientX - rect.left);
        const y = Math.round(clientY - rect.top);
        return { x: Math.max(0, Math.min(280, x)), y: Math.max(0, Math.min(280, y)) };
      }

      function startDraw(e) {
        e.preventDefault();
        saveCanvasState();
        isDrawing = true;
        hasDrawn = true;
        if (canvasPlaceholder) canvasPlaceholder.style.opacity = '0';
        
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;

        ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : '#0F172A';
        ctx.fillStyle = currentTool === 'eraser' ? '#FFFFFF' : '#0F172A';

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, currentStrokeWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }

      function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);

        ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : '#0F172A';
        const midX = (lastX + pos.x) / 2;
        const midY = (lastY + pos.y) / 2;
        ctx.quadraticCurveTo(lastX, lastY, midX, midY);
        ctx.stroke();

        lastX = pos.x;
        lastY = pos.y;
        prever();
      }

      function stopDraw() {
        if (!isDrawing) return;
        isDrawing = false;
        ctx.beginPath();
        prever();
      }

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      window.addEventListener('mouseup', stopDraw);

      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDraw);
      canvas.addEventListener('touchcancel', stopDraw);
    }

    // 3. Ferramentas Caneta / Borracha
    function setTool(tool) {
      currentTool = tool;
      if (tool === 'pen') {
        toolPen.className = 'px-2 py-1 text-xs font-semibold rounded bg-surface text-ink shadow-xs border border-line transition flex items-center gap-1';
        toolEraser.className = 'px-2 py-1 text-xs font-medium rounded text-inkMuted hover:text-ink transition flex items-center gap-1';
      } else {
        toolEraser.className = 'px-2 py-1 text-xs font-semibold rounded bg-surface text-ink shadow-xs border border-line transition flex items-center gap-1';
        toolPen.className = 'px-2 py-1 text-xs font-medium rounded text-inkMuted hover:text-ink transition flex items-center gap-1';
      }
    }

    toolPen.addEventListener('click', () => setTool('pen'));
    toolEraser.addEventListener('click', () => setTool('eraser'));

    // 4. Desfazer (Undo)
    function desfazer() {
      if (strokeHistory.length > 0) {
        const prevState = strokeHistory.pop();
        ctx.putImageData(prevState, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let hasInk = false;
        for (let i = 0; i < imgData.data.length; i += 4) {
          if (imgData.data[i] < 220) {
            hasInk = true;
            break;
          }
        }
        if (!hasInk) {
          limparCanvas();
        } else {
          prever();
        }
      }
    }
    btnUndo.addEventListener('click', desfazer);

    // 5. Controle de Espessura
    strokeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        strokeButtons.forEach(b => {
          b.className = 'btn-stroke px-2 py-0.5 text-[11px] font-medium rounded text-inkMuted hover:text-ink transition';
        });
        btn.className = 'btn-stroke px-2 py-0.5 text-[11px] font-medium rounded bg-slate-200 text-ink font-semibold transition';
        currentStrokeWidth = parseInt(btn.getAttribute('data-stroke'), 10);
        ctx.lineWidth = currentStrokeWidth;
      });
    });

    // 6. Desenhar Exemplo Sintético
    function drawSample(digit) {
      saveCanvasState();
      if (canvasPlaceholder) canvasPlaceholder.style.opacity = '0';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 200px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(digit, canvas.width / 2, canvas.height / 2 + 10);

      hasDrawn = true;
      prever();
    }

    sampleChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const digit = chip.getAttribute('data-digit');
        drawSample(digit);
      });
    });

    // 7. Limpar o Quadro
    function limparCanvas() {
      saveCanvasState();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      previewCtx.fillStyle = '#000000';
      previewCtx.fillRect(0, 0, 28, 28);

      hasDrawn = false;
      if (canvasPlaceholder) canvasPlaceholder.style.opacity = '1';
      heroDigit.innerText = '—';
      heroDigit.className = 'font-mono text-7xl font-extrabold text-slate-300 select-none transition-all duration-150';

      verdictPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> <span>Aguardando traço</span>';
      verdictPill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface border border-line text-inkMuted';
      runnerupText.innerText = 'Escreva qualquer número no quadro de desenho.';
      latencyText.innerText = '0.0 ms';

      for (let i = 0; i <= 9; i++) {
        const row = document.getElementById(`row-${i}`);
        const bar = document.getElementById(`bar-${i}`);
        const val = document.getElementById(`val-${i}`);

        row.className = 'flex items-center gap-3 px-2 py-1 rounded-md transition-colors duration-150';
        bar.style.width = '0%';
        bar.className = 'bar-smooth h-full bg-slate-300 rounded-full';
        val.innerText = '0.0%';
        val.className = 'w-12 text-right font-mono text-xs text-inkMuted font-medium';
      }
    }
    btnClear.addEventListener('click', limparCanvas);

    // 8. Atalhos de Teclado Globais
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        desfazer();
        return;
      }

      if (e.key.toLowerCase() === 'c' || e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        limparCanvas();
        return;
      }

      if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setTool('pen');
        return;
      }
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setTool('eraser');
        return;
      }

      if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        drawSample(e.key);
      }
    });

    // 9. Carregar o Modelo
    async function carregarModelo() {
      try {
        statusText.innerText = 'Carregando modelo_web/model.json...';
        statusDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';

        modelo = await tf.loadLayersModel('modelo_web/model.json');

        statusText.innerText = 'Modelo ativo (CNN Offline)';
        statusDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        console.log('✅ Modelo oficial carregado com sucesso!');
      } catch (err) {
        console.warn('Modelo em modelo_web/model.json não localizado. Inicializando modelo padrão no navegador...', err);
        modelo = tf.sequential({
          layers: [
            tf.layers.conv2d({ inputShape: [28, 28, 1], kernelSize: 3, filters: 32, activation: 'relu', padding: 'same' }),
            tf.layers.maxPooling2d({ poolSize: [2, 2] }),
            tf.layers.conv2d({ kernelSize: 3, filters: 64, activation: 'relu', padding: 'same' }),
            tf.layers.maxPooling2d({ poolSize: [2, 2] }),
            tf.layers.flatten(),
            tf.layers.dense({ units: 128, activation: 'relu' }),
            tf.layers.dense({ units: 10, activation: 'softmax' })
          ]
        });
        statusText.innerText = 'Modelo pronto (Cole os pesos no Colab)';
        statusDot.className = 'w-2 h-2 rounded-full bg-blue-500';
      }
    }

    // 10. Pipeline de Inferência com Auto-Centralização Bounding Box
    function prever() {
      if (!modelo || !hasDrawn) return;

      const tStart = performance.now();

      // Detecta Bounding Box do desenho
      const rawImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = rawImg.data;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      let hasInk = false;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          if (data[idx] < 220 || data[idx+1] < 220 || data[idx+2] < 220) {
            hasInk = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!hasInk) {
        limparCanvas();
        return;
      }

      minX = Math.max(0, minX - 6);
      minY = Math.max(0, minY - 6);
      maxX = Math.min(canvas.width - 1, maxX + 6);
      maxY = Math.min(canvas.height - 1, maxY + 6);

      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;

      // Canvas normalizador 28x28 (Centraliza em caixa 20x20 como no MNIST)
      const normCanvas = document.createElement('canvas');
      normCanvas.width = 28;
      normCanvas.height = 28;
      const normCtx = normCanvas.getContext('2d');

      normCtx.fillStyle = '#FFFFFF';
      normCtx.fillRect(0, 0, 28, 28);

      const scale = Math.min(20 / cropW, 20 / cropH);
      const destW = cropW * scale;
      const destH = cropH * scale;
      const destX = (28 - destW) / 2;
      const destY = (28 - destH) / 2;

      normCtx.drawImage(canvas, minX, minY, cropW, cropH, destX, destY, destW, destH);

      // Renderiza o preview 28x28 invertido
      previewCtx.drawImage(normCanvas, 0, 0, 28, 28);
      const previewImg = previewCtx.getImageData(0, 0, 28, 28);
      const pData = previewImg.data;
      for (let i = 0; i < pData.length; i += 4) {
        const avg = (pData[i] + pData[i + 1] + pData[i + 2]) / 3;
        const inverted = 255 - avg;
        pData[i] = inverted;
        pData[i + 1] = inverted;
        pData[i + 2] = inverted;
      }
      previewCtx.putImageData(previewImg, 0, 0);

      tf.tidy(() => {
        const rawTensor = tf.browser.fromPixels(normCanvas, 1)
          .toFloat()
          .div(255.0);

        const invertedTensor = tf.scalar(1.0).sub(rawTensor);
        const batchTensor = invertedTensor.expandDims(0);

        const probs = modelo.predict(batchTensor).dataSync();
        const tEnd = performance.now();
        const latency = (tEnd - tStart).toFixed(1);
        latencyText.innerText = `${latency} ms`;

        const indexed = Array.from(probs).map((p, idx) => ({ digit: idx, prob: p }));
        indexed.sort((a, b) => b.prob - a.prob);

        const top1 = indexed[0];
        const top2 = indexed[1];

        for (let i = 0; i < 10; i++) {
          const prob = probs[i];
          const pct = (prob * 100).toFixed(1);
          const row = document.getElementById(`row-${i}`);
          const bar = document.getElementById(`bar-${i}`);
          const val = document.getElementById(`val-${i}`);

          bar.style.width = `${pct}%`;
          val.innerText = `${pct}%`;

          if (i === top1.digit && top1.prob > 0.05) {
            row.className = 'flex items-center gap-3 px-2 py-1 rounded-md bg-slate-100 font-semibold transition-colors duration-150';
            bar.className = 'bar-smooth h-full bg-slate-900 rounded-full';
            val.className = 'w-12 text-right font-mono text-xs text-slate-900 font-bold';
          } else {
            row.className = 'flex items-center gap-3 px-2 py-1 rounded-md transition-colors duration-150';
            bar.className = 'bar-smooth h-full bg-slate-300 rounded-full';
            val.className = 'w-12 text-right font-mono text-xs text-inkMuted font-medium';
          }
        }

        if (top1.prob > 0.05) {
          heroDigit.innerText = top1.digit;
          heroDigit.className = 'font-mono text-7xl font-extrabold text-slate-900 select-none scale-105 transition-all duration-150';

          const pct1 = (top1.prob * 100).toFixed(1);
          const pct2 = (top2.prob * 100).toFixed(1);

          if (top1.prob >= 0.80) {
            verdictPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> <span class="text-emerald-700 font-semibold">${pct1}% de Certeza</span>`;
            verdictPill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 border border-emerald-200';
            runnerupText.innerHTML = `Dígito <strong class="text-ink font-bold">${top1.digit}</strong> identificado com alta precisão.`;
          } else if (top1.prob >= 0.50) {
            verdictPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span> <span class="text-amber-700 font-semibold">${pct1}% de Certeza</span>`;
            verdictPill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 border border-amber-200';
            runnerupText.innerHTML = `Dígito <strong class="text-ink font-bold">${top1.digit}</strong>, com confusão próxima do <strong class="text-ink font-bold">${top2.digit}</strong> (${pct2}%).`;
          } else {
            verdictPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span> <span class="text-rose-700 font-semibold">${pct1}% (Ambiguidade)</span>`;
            verdictPill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 border border-rose-200';
            runnerupText.innerHTML = `Traço em disputa entre <strong class="text-ink font-bold">${top1.digit}</strong> (${pct1}%) e <strong class="text-ink font-bold">${top2.digit}</strong> (${pct2}%).`;
          }
        }
      });
    }

    initBars();
    setupCanvas();
    carregarModelo();
