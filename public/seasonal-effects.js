// Seasonal Effects Library
// Snow Effect
function createSnowEffect() {
  const snowContainer = document.createElement('div');
  snowContainer.id = 'snow-container';
  snowContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(snowContainer);
  
  for (let i = 0; i < 50; i++) {
    createSnowflake(snowContainer);
  }
}

function createSnowflake(container) {
  const snowflake = document.createElement('div');
  snowflake.innerHTML = '❄';
  snowflake.style.cssText = `
    position:absolute;
    color:#fff;
    font-size:${Math.random() * 10 + 10}px;
    left:${Math.random() * 100}%;
    animation:snowfall ${Math.random() * 3 + 2}s linear infinite;
    opacity:${Math.random() * 0.6 + 0.4};
  `;
  snowflake.style.animationDelay = `${Math.random() * 2}s`;
  container.appendChild(snowflake);
  
  // Add CSS animation if not exists
  if (!document.getElementById('snowfall-style')) {
    const style = document.createElement('style');
    style.id = 'snowfall-style';
    style.textContent = `
      @keyframes snowfall {
        0% { top: -10%; transform: translateX(0) rotate(0deg); }
        100% { top: 110%; transform: translateX(50px) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Confetti Effect
function createConfettiEffect() {
  const confettiContainer = document.createElement('div');
  confettiContainer.id = 'confetti-container';
  confettiContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;overflow:hidden;';
  document.body.appendChild(confettiContainer);
  
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
  
  for (let i = 0; i < 100; i++) {
    setTimeout(() => createConfetti(confettiContainer, colors), i * 30);
  }
}

function createConfetti(container, colors) {
  const confetti = document.createElement('div');
  confetti.style.cssText = `
    position:absolute;
    width:${Math.random() * 6 + 4}px;
    height:${Math.random() * 10 + 5}px;
    background:${colors[Math.floor(Math.random() * colors.length)]};
    left:${Math.random() * 100}%;
    top:-20px;
    opacity:${Math.random() * 0.6 + 0.4};
    animation:confettifall ${Math.random() * 3 + 2}s linear infinite;
  `;
  confetti.style.animationDelay = `${Math.random() * 2}s`;
  container.appendChild(confetti);
  
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confettifall {
        0% { top: -10%; transform: translateX(0) rotate(0deg); }
        100% { top: 110%; transform: translateX(${Math.random() * 200 - 100}px) rotate(${Math.random() * 720}deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Fireworks Effect
function createFireworksEffect() {
  const canvas = document.createElement('canvas');
  canvas.id = 'fireworks-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9997;';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const fireworks = [];
  const particles = [];
  
  function Firework(x, y) {
    this.x = x;
    this.y = canvas.height;
    this.targetY = y;
    this.speed = 5;
    this.alive = true;
  }
  
  Firework.prototype.update = function() {
    this.y -= this.speed;
    if (this.y <= this.targetY) {
      this.alive = false;
      createParticles(this.x, this.y);
    }
  };
  
  Firework.prototype.draw = function() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  };
  
  function Particle(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
    this.life = 60;
    this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
  }
  
  Particle.prototype.update = function() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life--;
  };
  
  Particle.prototype.draw = function() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life / 60;
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  
  function createParticles(x, y) {
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle(x, y));
    }
  }
  
  function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (Math.random() < 0.05) {
      fireworks.push(new Firework(
        Math.random() * canvas.width,
        Math.random() * canvas.height * 0.5
      ));
    }
    
    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      fireworks[i].draw();
      if (!fireworks[i].alive) {
        fireworks.splice(i, 1);
      }
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }
    
    requestAnimationFrame(animate);
  }
  
  animate();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// Festive Lights Effect
function createLightsEffect() {
  const lightsContainer = document.createElement('div');
  lightsContainer.id = 'lights-container';
  lightsContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:50px;pointer-events:none;z-index:9996;display:flex;justify-content:space-around;';
  document.body.appendChild(lightsContainer);
  
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const numLights = 20;
  
  for (let i = 0; i < numLights; i++) {
    const light = document.createElement('div');
    light.style.cssText = `
      width:10px;
      height:10px;
      border-radius:50%;
      background:${colors[i % colors.length]};
      animation:twinkle ${Math.random() * 2 + 1}s ease-in-out infinite;
      box-shadow:0 0 10px ${colors[i % colors.length]};
    `;
    light.style.animationDelay = `${Math.random()}s`;
    lightsContainer.appendChild(light);
  }
  
  if (!document.getElementById('lights-style')) {
    const style = document.createElement('style');
    style.id = 'lights-style';
    style.textContent = `
      @keyframes twinkle {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(0.8); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Apply all enabled effects
function applySeasonalEffects(settings) {
  if (!settings || !settings.is_active) return;
  
  if (settings.enable_snow) createSnowEffect();
  if (settings.enable_confetti) createConfettiEffect();
  if (settings.enable_fireworks) createFireworksEffect();
  if (settings.enable_lights) createLightsEffect();
  
  // Apply custom message
  if (settings.custom_message) {
    const messageBar = document.createElement('div');
    messageBar.style.cssText = `
      position:fixed;
      top:0;
      left:0;
      width:100%;
      background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color:white;
      text-align:center;
      padding:12px;
      font-size:18px;
      font-weight:bold;
      z-index:10000;
      box-shadow:0 2px 10px rgba(0,0,0,0.2);
      animation:slideDown 0.5s ease-out;
    `;
    messageBar.textContent = settings.custom_message;
    document.body.appendChild(messageBar);
    
    // Adjust body padding to account for message bar
    document.body.style.paddingTop = '48px';
    
    if (!document.getElementById('message-style')) {
      const style = document.createElement('style');
      style.id = 'message-style';
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Apply theme colors
  if (settings.theme_primary_color) {
    document.documentElement.style.setProperty('--theme-primary', settings.theme_primary_color);
  }
}

// Initialize
window.initSeasonalEffects = function(propertyId) {
  fetch(`/api/seasonal-settings/${propertyId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.settings) {
        applySeasonalEffects(data.settings);
      }
    })
    .catch(err => console.error('Failed to load seasonal effects:', err));
};
