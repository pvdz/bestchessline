/**
 * Confetti Utility Functions
 *
 * Provides simple confetti animation for celebrations
 */

/**
 * Create a confetti particle element
 */
function createConfettiParticle(): HTMLElement {
  const particle = document.createElement("div");
  particle.style.position = "fixed";
  particle.style.width = "8px";
  particle.style.height = "8px";
  particle.style.borderRadius = "50%";
  particle.style.pointerEvents = "none";
  particle.style.zIndex = "9999";

  // Random color from a festive palette
  const colors = [
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#feca57",
    "#ff9ff3",
    "#54a0ff",
    "#5f27cd",
  ];
  particle.style.backgroundColor =
    colors[Math.floor(Math.random() * colors.length)];

  return particle;
}

/**
 * Animate a confetti particle with explosion effect
 */
function animateConfettiParticle(particle: HTMLElement): void {
  const duration = 2500 + Math.random() * 1000; // 2.5-3.5 seconds
  const startTime = Date.now();

  // Start from center of screen
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  particle.style.left = centerX + "px";
  particle.style.top = centerY + "px";

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      particle.remove();
      return;
    }

    // Explosion effect: particles burst outward in all directions
    const angle = Math.random() * Math.PI * 2; // Random direction
    const distance = 150 + Math.random() * 200; // Random distance

    // Calculate final position
    const x = centerX + Math.cos(angle) * distance * progress;
    const y = centerY + Math.sin(angle) * distance * progress;

    // Add gravity effect (particles fall down)
    const gravity = progress * progress * 100; // Quadratic fall
    const finalY = y + gravity;

    // Add some wobble
    const wobbleX = Math.sin(progress * Math.PI * 6) * 15;
    const wobbleY = Math.cos(progress * Math.PI * 4) * 10;

    const finalX = x + wobbleX;
    const finalYWithWobble = finalY + wobbleY;

    // Rotation and scaling
    const rotation = progress * 360; // One full rotation
    const scale = 1 - progress * 0.3; // Shrink slightly

    particle.style.left = finalX + "px";
    particle.style.top = finalYWithWobble + "px";
    particle.style.transform = `rotate(${rotation}deg) scale(${scale})`;
    particle.style.opacity = (1 - progress * 0.4).toString();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

/**
 * Trigger confetti animation with pop effect
 * @param particleCount Number of confetti particles (default: 50)
 */
export function triggerConfetti(particleCount: number = 50): void {
  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => {
      const particle = createConfettiParticle();
      document.body.appendChild(particle);
      animateConfettiParticle(particle);
    }, i * 20); // Faster stagger for pop effect
  }
}
