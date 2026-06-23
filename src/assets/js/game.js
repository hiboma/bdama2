class Component extends DCLogic {
  SIZE = 600;
  R = 13;
  B = 14;

  buildLevels() {
    const S = this.SIZE, B = this.B;
    const borders = [
      {x:0,y:0,w:S,h:B},{x:0,y:S-B,w:S,h:B},
      {x:0,y:0,w:B,h:S},{x:S-B,y:0,w:B,h:S}
    ];
    const L = [
      { walls:[{x:200,y:B,w:B,h:366},{x:400,y:220,w:B,h:S-B-220}],
        holeCount:2, holeR:19, starCount:3,
        start:{x:64,y:64}, goal:{x:540,y:540,r:24} },
      { walls:[{x:150,y:B,w:B,h:330},{x:300,y:S-B-330,w:B,h:330},{x:450,y:B,w:B,h:300}],
        holeCount:4, holeR:18, starCount:4,
        start:{x:64,y:64}, goal:{x:540,y:540,r:24} },
      { walls:[{x:120,y:B,w:B,h:360},{x:240,y:S-B-360,w:B,h:360},{x:360,y:B,w:B,h:360},{x:480,y:S-B-360,w:B,h:360}],
        holeCount:5, holeR:17, starCount:5,
        start:{x:64,y:64}, goal:{x:545,y:64,r:22} }
    ];
    return L.map(l => {
      const allWalls = [...borders, ...l.walls];
      const holes = this.randomHoles(allWalls, l.start, l.goal, l.holeCount, l.holeR, S, B);
      const starR = 10;
      const occupied = holes.map(h => ({x:h.x, y:h.y, r:h.r}));
      const stars = this.randomPoints(allWalls, l.start, l.goal, occupied, l.starCount || 3, starR, S, B);
      return {...l, walls:allWalls, holes, stars};
    });
  }

  randomHoles(walls, start, goal, count, r, S, B) {
    const margin = B + r + 4;
    const holes = [];
    const minDist = r * 4;
    for (let attempt = 0; holes.length < count && attempt < 500; attempt++) {
      const x = margin + Math.random() * (S - margin * 2);
      const y = margin + Math.random() * (S - margin * 2);
      if (Math.hypot(x - start.x, y - start.y) < 60) continue;
      if (Math.hypot(x - goal.x, y - goal.y) < goal.r + r + 20) continue;
      let tooClose = false;
      for (const h of holes) {
        if (Math.hypot(x - h.x, y - h.y) < minDist) { tooClose = true; break; }
      }
      if (tooClose) continue;
      let onWall = false;
      for (const w of walls) {
        const cx = Math.max(w.x, Math.min(x, w.x + w.w));
        const cy = Math.max(w.y, Math.min(y, w.y + w.h));
        if (Math.hypot(x - cx, y - cy) < r + 8) { onWall = true; break; }
      }
      if (onWall) continue;
      holes.push({x, y, r});
    }
    return holes;
  }

  randomPoints(walls, start, goal, occupied, count, r, S, B) {
    const margin = B + r + 4;
    const points = [];
    const minDist = r * 3;
    for (let attempt = 0; points.length < count && attempt < 500; attempt++) {
      const x = margin + Math.random() * (S - margin * 2);
      const y = margin + Math.random() * (S - margin * 2);
      if (Math.hypot(x - start.x, y - start.y) < 50) continue;
      if (Math.hypot(x - goal.x, y - goal.y) < goal.r + r + 10) continue;
      let tooClose = false;
      for (const p of [...points, ...occupied]) {
        const dist = p.r ? p.r + r + 8 : minDist;
        if (Math.hypot(x - p.x, y - p.y) < dist) { tooClose = true; break; }
      }
      if (tooClose) continue;
      let onWall = false;
      for (const w of walls) {
        const cx = Math.max(w.x, Math.min(x, w.x + w.w));
        const cy = Math.max(w.y, Math.min(y, w.y + w.h));
        if (Math.hypot(x - cx, y - cy) < r + 6) { onWall = true; break; }
      }
      if (onWall) continue;
      points.push({x, y, r, collected:false});
    }
    return points;
  }

  onCanvas = (el) => {
    if (!el) return;
    this.canvas = el;
    this.bindCanvas();
    if (!this._started) { this._started = true; this.setupGame(); }
  };

  bindCanvas() {
    const c = this.canvas;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = this.SIZE * this.dpr;
    c.height = this.SIZE * this.dpr;
    this.ctx = c.getContext('2d');
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  onStage  = (el) => this.elStage  = el;
  onTimer  = (el) => this.elTimer  = el;
  onFalls  = (el) => this.elFalls  = el;
  onScore  = (el) => this.elScore = el;
  onOverlay= (el) => this.elOverlay= el;
  onOvIcon = (el) => this.elOvIcon = el;
  onOvTitle= (el) => this.elOvTitle= el;
  onOvSub  = (el) => this.elOvSub  = el;
  onOvBtn  = (el) => this.elOvBtn  = el;

  keys = {};
  onPadDown = (e) => { e.preventDefault(); this.keys[e.currentTarget.dataset.dir]=true; };
  onPadUp   = (e) => { e.preventDefault(); this.keys[e.currentTarget.dataset.dir]=false; };

  setupGame() {
    this.levels = this.buildLevels();
    this.tilt = {x:0, y:0};
    this.totalFalls = 0;
    this.score = 0;
    this.loadLevel(0);

    this.keyHandler = (e, down) => {
      const m = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',
        w:'up',s:'down',a:'left',d:'right',W:'up',S:'down',A:'left',D:'right'}[e.key];
      if (m) { this.keys[m]=down; e.preventDefault(); }
    };
    this._kd = (e)=>this.keyHandler(e,true);
    this._ku = (e)=>this.keyHandler(e,false);
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);

    this._orient = (e) => {
      if (e.gamma==null) return;
      this._og = Math.max(-30, Math.min(30, e.gamma));
      this._ob = Math.max(-30, Math.min(30, e.beta));
      this._useOrient = true;
    };
    this.requestGyroPermission();

    this.last = performance.now();
    this.draw();
    this.timer = setInterval(() => { this.tick(performance.now()); }, 1000/60);
  }

  requestGyroPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      this._gyroGranted = false;
      this._gyroBtn = document.createElement('button');
      const btn = this._gyroBtn;
      btn.textContent = 'かたむき操作を有効にする';
      btn.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:10000;' +
        'padding:12px 24px;border-radius:8px;border:none;background:#1f7acc;color:#fff;' +
        'font-size:1rem;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);' +
        'font-family:inherit;';
      btn.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission().then((state) => {
          if (state === 'granted') {
            this._gyroGranted = true;
            window.addEventListener('deviceorientation', this._orient);
          }
          btn.remove();
          this._gyroBtn = null;
        }).catch(() => {
          btn.remove();
          this._gyroBtn = null;
        });
      });
      document.body.appendChild(btn);
    } else {
      window.addEventListener('deviceorientation', this._orient);
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('deviceorientation', this._orient);
    if (this._gyroBtn) { this._gyroBtn.remove(); this._gyroBtn = null; }
  }

  loadLevel(i) {
    this.li = i;
    const lv = this.levels[i];
    this.marble = {x:lv.start.x, y:lv.start.y, vx:0, vy:0};
    this.status = 'play';
    this.fall = null;
    this.startTime = performance.now();
    this.elapsed = 0;
    for (const s of lv.stars) s.collected = false;
    this.starEffects = [];
    if (this.elStage) this.elStage.textContent = (i+1) + ' / ' + this.levels.length;
    if (this.elOverlay) this.elOverlay.style.display = 'none';
  }

  fmt(ms) {
    const s = ms/1000;
    const mm = Math.floor(s/60);
    const ss = (s%60).toFixed(1);
    return String(mm).padStart(2,'0') + ':' + ss.padStart(4,'0');
  }

  restart = () => {
    this.totalFalls = 0;
    this.score = 0;
    if(this.elFalls) this.elFalls.textContent='0';
    if(this.elScore) this.elScore.textContent='0';
    this.levels = this.buildLevels();
    this.loadLevel(0);
  };

  onOverlayAction = () => {
    if (this.status === 'win') this.loadLevel(this.li + 1);
    else if (this.status === 'complete') this.restart();
    else this.loadLevel(this.li);
  };

  showOverlay(kind) {
    const o = this.elOverlay; if (!o) return;
    if (kind === 'win') {
      this.elOvIcon.style.background = 'radial-gradient(circle at 32% 28%, #eaf4ff 0%, #6aaeeb 42%, #0a62ad 100%)';
      this.elOvTitle.textContent = 'ステージクリア';
      this.elOvSub.textContent = 'タイム ' + this.fmt(this.elapsed);
      this.elOvBtn.textContent = '次のステージ';
    } else if (kind === 'complete') {
      this.elOvIcon.style.background = 'radial-gradient(circle at 32% 28%, #eafff6 0%, #6aebbb 42%, #00a367 100%)';
      this.elOvTitle.textContent = '全ステージ クリア';
      this.elOvSub.textContent = 'スコア ' + this.score + ' / 落下 ' + this.totalFalls + ' 回';
      this.elOvBtn.textContent = 'もう一度あそぶ';
    } else {
      this.elOvIcon.style.background = 'radial-gradient(circle at 50% 38%, #393c41 0%, #1f2024 70%)';
      this.elOvTitle.textContent = '穴に落ちた';
      this.elOvSub.textContent = 'もう一度ためそう';
      this.elOvBtn.textContent = 'やり直す';
    }
    o.style.display = 'flex';
  }

  collide(m) {
    const lv = this.levels[this.li];
    for (const w of lv.walls) {
      const cx = Math.max(w.x, Math.min(m.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(m.y, w.y + w.h));
      let dx = m.x - cx, dy = m.y - cy;
      let d2 = dx*dx + dy*dy;
      if (d2 < this.R*this.R) {
        let d = Math.sqrt(d2), nx, ny;
        if (d > 0.0001) { nx = dx/d; ny = dy/d; }
        else {
          const l=m.x-w.x, r=w.x+w.w-m.x, t=m.y-w.y, b=w.y+w.h-m.y;
          const mn=Math.min(l,r,t,b);
          if(mn===l){nx=-1;ny=0;} else if(mn===r){nx=1;ny=0;}
          else if(mn===t){nx=0;ny=-1;} else {nx=0;ny=1;}
          d = 0;
        }
        const pen = this.R - d;
        m.x += nx*pen; m.y += ny*pen;
        const vn = m.vx*nx + m.vy*ny;
        if (vn < 0) { const e=0.35; m.vx -= (1+e)*vn*nx; m.vy -= (1+e)*vn*ny; }
      }
    }
  }

  tick(t) {
    let dt = (t - this.last)/1000; this.last = t;
    if (dt > 0.05) dt = 0.05;
    const m = this.marble, lv = this.levels[this.li];

    if (this.status === 'play' && !this.fall) {
      let ax=0, ay=0;
      if (this._useOrient) { ax = this._og/30; ay = this._ob/30; }
      if (this.keys.left) ax -= 1; if (this.keys.right) ax += 1;
      if (this.keys.up) ay -= 1; if (this.keys.down) ay += 1;
      ax = Math.max(-1,Math.min(1,ax)); ay = Math.max(-1,Math.min(1,ay));
      const G = 1000;
      m.vx += ax*G*dt; m.vy += ay*G*dt;
      const fr = Math.pow(0.12, dt);
      m.vx *= fr; m.vy *= fr;
      const sp = Math.hypot(m.vx, m.vy), MAX = 620;
      if (sp > MAX) { m.vx *= MAX/sp; m.vy *= MAX/sp; }

      const dist = sp*dt;
      const steps = Math.max(1, Math.ceil(dist/(this.R*0.5)));
      for (let i=0;i<steps;i++){ m.x += m.vx*dt/steps; m.y += m.vy*dt/steps; this.collide(m); }

      for (const s of lv.stars) {
        if (!s.collected && Math.hypot(m.x - s.x, m.y - s.y) < this.R + s.r) {
          s.collected = true;
          this.score += 100;
          if (this.elScore) this.elScore.textContent = String(this.score);
          this.starEffects.push({x:s.x, y:s.y, t:0});
          this.playSfx('star');
        }
      }

      for (const h of lv.holes) {
        if (Math.hypot(m.x-h.x, m.y-h.y) < h.r - 3) {
          this.fall = {x:h.x, y:h.y, r0:this.R, t:0}; this.playSfx('fall'); break;
        }
      }
      if (!this.fall && Math.hypot(m.x-lv.goal.x, m.y-lv.goal.y) < lv.goal.r - 4) {
        this.elapsed = t - this.startTime;
        this.status = (this.li === this.levels.length-1) ? 'complete' : 'win';
        this.playSfx('goal');
        this.showOverlay(this.status);
      }
      this.elapsed = t - this.startTime;
    }

    if (this.fall) {
      this.fall.t += dt;
      m.x += (this.fall.x - m.x)*Math.min(1, dt*10);
      m.y += (this.fall.y - m.y)*Math.min(1, dt*10);
      m.vx=0; m.vy=0;
      if (this.fall.t > 0.45) {
        this.fall = null;
        this.totalFalls++;
        if (this.elFalls) this.elFalls.textContent = String(this.totalFalls);
        this.status = 'lose';
        this.showOverlay('lose');
      }
    }

    this.starEffects = this.starEffects.filter(e => { e.t += dt; return e.t < 0.4; });

    if (this.elTimer && this.status==='play') this.elTimer.textContent = this.fmt(this.elapsed);
    this.draw();
  }

  draw() {
    const ctx = this.ctx, S = this.SIZE, lv = this.levels[this.li], m = this.marble;
    ctx.clearRect(0,0,S,S);
    ctx.fillStyle = '#edeef0'; ctx.fillRect(0,0,S,S);

    // subtle grid
    ctx.strokeStyle = 'rgba(57,60,65,.05)'; ctx.lineWidth = 1;
    for (let g=40; g<S; g+=40){ ctx.beginPath(); ctx.moveTo(g,0); ctx.lineTo(g,S); ctx.moveTo(0,g); ctx.lineTo(S,g); ctx.stroke(); }

    // holes
    for (const h of lv.holes) {
      const g = ctx.createRadialGradient(h.x,h.y,1,h.x,h.y,h.r);
      g.addColorStop(0,'#000'); g.addColorStop(.7,'#1f2024'); g.addColorStop(1,'#585c63');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,7); ctx.fill();
    }

    // stars
    for (const s of lv.stars) {
      if (s.collected) continue;
      this.drawStar(ctx, s.x, s.y, s.r);
    }
    for (const e of this.starEffects) {
      const progress = e.t / 0.4;
      const alpha = 1 - progress;
      const scale = 1 + progress * 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      this.drawStar(ctx, e.x, e.y, 10 * scale);
      ctx.restore();
    }

    // goal
    const gl = lv.goal;
    ctx.fillStyle = 'rgba(31,122,204,.12)'; ctx.beginPath(); ctx.arc(gl.x,gl.y,gl.r,0,7); ctx.fill();
    ctx.strokeStyle = '#1f7acc'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(gl.x,gl.y,gl.r-2,0,7); ctx.stroke();
    ctx.fillStyle = '#1f7acc'; ctx.beginPath(); ctx.arc(gl.x,gl.y,gl.r*0.4,0,7); ctx.fill();

    // walls
    ctx.fillStyle = '#585c63';
    for (const w of lv.walls) { this.rr(ctx,w.x,w.y,w.w,w.h,3); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (const w of lv.walls) { this.rr(ctx,w.x,w.y,w.w,Math.min(4,w.h),3); ctx.fill(); }

    // marble
    let r = this.R;
    if (this.fall) r = this.R * Math.max(0, 1 - this.fall.t/0.45);
    if (r > 0.5) {
      ctx.fillStyle = 'rgba(31,32,36,.28)';
      ctx.beginPath(); ctx.ellipse(m.x+2, m.y+4, r*1.02, r*0.9, 0, 0, 7); ctx.fill();
      const g = ctx.createRadialGradient(m.x-r*0.35, m.y-r*0.4, r*0.1, m.x, m.y, r);
      g.addColorStop(0,'#fdfdff'); g.addColorStop(.35,'#9acaf5'); g.addColorStop(.8,'#1f7acc'); g.addColorStop(1,'#034782');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x,m.y,r,0,7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.ellipse(m.x-r*0.32, m.y-r*0.36, r*0.22, r*0.14, -0.6, 0, 7); ctx.fill();
    }
  }

  drawStar(ctx, cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = -Math.PI/2 + (i * 2 * Math.PI / 5);
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = Math.cos(outerAngle) * r;
      const oy = Math.sin(outerAngle) * r;
      const ix = Math.cos(innerAngle) * r * 0.4;
      const iy = Math.sin(innerAngle) * r * 0.4;
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  getAudioCtx() {
    if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    return this._audioCtx;
  }

  playSfx(type) {
    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;

    if (type === 'star') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'fall') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'goal') {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const t = now + i * 0.1;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    }
  }

  rr(ctx,x,y,w,h,r){
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  renderVals() {
    return {
      onCanvas:this.onCanvas, onStage:this.onStage, onTimer:this.onTimer, onFalls:this.onFalls, onScore:this.onScore,
      onOverlay:this.onOverlay, onOvIcon:this.onOvIcon, onOvTitle:this.onOvTitle, onOvSub:this.onOvSub, onOvBtn:this.onOvBtn,
      onPadDown:this.onPadDown, onPadUp:this.onPadUp,
      restart:this.restart, onOverlayAction:this.onOverlayAction
    };
  }
}
