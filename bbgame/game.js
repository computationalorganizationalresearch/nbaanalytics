class Player {
  constructor(x, y, team, id) {
    this.x = x;
    this.y = y;
    this.team = team; // 'home' or 'away'
    this.id = id;
    this.radius = 10;
    this.color = team === 'home' ? 'blue' : 'red';
    this.target = { x, y };
  }

  setTarget(x, y) {
    this.target = { x, y };
  }

  update(dt) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = 80; // pixels per second
    if (dist > 1) {
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }
}

class Ball {
  constructor(holder) {
    this.holder = holder; // Player instance or null
    this.x = holder ? holder.x : 0;
    this.y = holder ? holder.y : 0;
    this.radius = 5;
    this.passTarget = null; // {x, y, player}
  }

  passTo(player) {
    this.holder = null;
    this.passTarget = { x: player.x, y: player.y, player };
  }

  reset(holder) {
    this.holder = holder;
    this.passTarget = null;
    this.x = holder.x;
    this.y = holder.y;
  }

  update(dt) {
    if (this.holder) {
      this.x = this.holder.x;
      this.y = this.holder.y;
    } else if (this.passTarget) {
      const dx = this.passTarget.x - this.x;
      const dy = this.passTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      const speed = 150;
      if (dist > 2) {
        this.x += (dx / dist) * speed * dt;
        this.y += (dy / dist) * speed * dt;
      } else {
        this.holder = this.passTarget.player;
        this.passTarget = null;
      }
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'orange';
    ctx.fill();
    ctx.closePath();
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.players = [];
    this.playerMap = { home: {}, away: {} };
    this.ball = null;
    this.offense = [];
    this.nextStep = 0;
    this.lastTime = 0;
    this.startTime = null;
    this.running = false;
    this.homeScore = 0;
    this.awayScore = 0;
    this.createPlayers();
    this.setDefensiveStrategy();
    this.setOffensivePlay();
    this.ball = new Ball(this.playerMap.home[0]);
    this.updateScoreboard();
    requestAnimationFrame(t => this.loop(t));
  }

  createPlayers() {
    for (let i = 0; i < 5; i++) {
      const home = new Player(100, 80 + i * 50, 'home', i);
      const away = new Player(500, 80 + i * 50, 'away', i);
      this.players.push(home, away);
      this.playerMap.home[i] = home;
      this.playerMap.away[i] = away;
    }
  }

  setDefensiveStrategy() {
    this.defense = {
      home: {
        0: { x: 200, y: 100 },
        1: { x: 200, y: 150 },
        2: { x: 200, y: 200 },
        3: { x: 200, y: 250 },
        4: { x: 200, y: 300 }
      },
      away: {
        0: { x: 400, y: 100 },
        1: { x: 400, y: 150 },
        2: { x: 400, y: 200 },
        3: { x: 400, y: 250 },
        4: { x: 400, y: 300 }
      }
    };
    for (const p of this.players) {
      const strat = this.defense[p.team][p.id];
      p.setTarget(strat.x, strat.y);
    }
  }

  setOffensivePlay() {
    // simple timed actions
    this.offense = [
      { time: 1, action: 'move', team: 'home', id: 0, x: 250, y: 120 },
      { time: 2, action: 'pass', from: { team: 'home', id: 0 }, to: { team: 'home', id: 1 } },
      { time: 3, action: 'move', team: 'home', id: 1, x: 300, y: 150 },
      { time: 4, action: 'shoot', team: 'home', id: 1 }
    ];
    this.nextStep = 0;
  }

  executeStep(step) {
    if (step.action === 'move') {
      this.playerMap[step.team][step.id].setTarget(step.x, step.y);
    } else if (step.action === 'pass') {
      const to = this.playerMap[step.to.team][step.to.id];
      this.ball.passTo(to);
    } else if (step.action === 'shoot') {
      const shooter = this.playerMap[step.team][step.id];
      const success = Math.random() < 0.5;
      if (success) {
        if (shooter.team === 'home') this.homeScore += 2; else this.awayScore += 2;
      }
      this.updateScoreboard();
      this.ball.reset(shooter);
    }
  }

  updateScoreboard() {
    const board = document.getElementById('scoreboard');
    board.textContent = `${this.homeScore} - ${this.awayScore}`;
  }

  start() {
    this.running = true;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
  }

  loop(timestamp) {
    if (!this.running) {
      requestAnimationFrame(t => this.loop(t));
      return;
    }
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    const elapsed = (timestamp - this.startTime) / 1000;
    while (this.nextStep < this.offense.length && elapsed >= this.offense[this.nextStep].time) {
      this.executeStep(this.offense[this.nextStep]);
      this.nextStep++;
    }
    this.update(dt);
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    for (const p of this.players) {
      p.update(dt);
    }
    this.ball.update(dt);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = '#000';
    this.ctx.strokeRect(50, 50, 500, 300);
    for (const p of this.players) {
      p.draw(this.ctx);
    }
    this.ball.draw(this.ctx);
  }
}

window.onload = function() {
  const canvas = document.getElementById('court');
  const game = new Game(canvas);
  document.getElementById('start').onclick = () => game.start();
};
