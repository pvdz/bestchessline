/**
 * Enhanced Confetti Utility Functions
 *
 * Provides robust confetti animation with rainbow effects for celebrations
 */

interface ConfettiParticle {
  element: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  opacity: number;
  color: string;
  shape: "circle" | "square" | "triangle";
}

/**
 * Create a confetti particle element with enhanced styling
 */
function createConfettiParticle(): ConfettiParticle {
  const particle = document.createElement("div");

  // Base styling
  particle.style.position = "fixed";
  particle.style.pointerEvents = "none";
  particle.style.zIndex = "9999";
  particle.style.transform = "translate(-50%, -50%)";
  particle.style.transition = "none";
  particle.style.boxShadow = "0 0 6px rgba(0, 0, 0, 0.4)";
  particle.style.borderRadius = "50%";

  // Random size between 6-12px
  const size = 6 + Math.random() * 6;
  particle.style.width = size + "px";
  particle.style.height = size + "px";

  // Rainbow color palette
  const colors = [
    "#ff0000", // Red
    "#ff7f00", // Orange
    "#ffff00", // Yellow
    "#00ff00", // Green
    "#0000ff", // Blue
    "#4b0082", // Indigo
    "#9400d3", // Violet
    "#ff69b4", // Hot Pink
    "#00ffff", // Cyan
    "#ff1493", // Deep Pink
    "#32cd32", // Lime Green
    "#ff4500", // Orange Red
  ];

  const color = colors[Math.floor(Math.random() * colors.length)];
  particle.style.backgroundColor = color;

  // Random shape
  const shapes = ["circle", "square", "triangle"] as const;
  const shape = shapes[Math.floor(Math.random() * shapes.length)];

  if (shape === "square") {
    particle.style.borderRadius = "0";
  } else if (shape === "triangle") {
    particle.style.borderRadius = "0";
    particle.style.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
  }

  return {
    element: particle,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 20,
    scale: 1,
    opacity: 1,
    color,
    shape,
  };
}

/**
 * Enhanced confetti animation with multiple launch points and rainbow effect
 */
function animateConfettiParticle(
  particle: ConfettiParticle,
  launchPoint: { x: number; y: number },
): void {
  const duration = 3000 + Math.random() * 1500; // 3-4.5 seconds
  const startTime = Date.now();

  // Set initial position
  particle.x = launchPoint.x;
  particle.y = launchPoint.y;
  particle.element.style.left = particle.x + "px";
  particle.element.style.top = particle.y + "px";

  // Initial velocity - shoot upward and outward from corner
  const angle = Math.PI / 3 + ((Math.random() - 0.5) * Math.PI) / 3; // 60° ± 30° for wider spread
  const speed = 700 + Math.random() * 800; // Higher initial speed for more dramatic effect
  const direction = -1; // Always shoot leftward from right corner
  particle.vx = Math.cos(angle) * speed * direction;
  particle.vy = -Math.sin(angle) * speed;

  // Add some initial random velocity for more chaotic movement
  particle.vx += (Math.random() - 0.5) * 200;
  particle.vy += (Math.random() - 0.5) * 150;

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      particle.element.remove();
      return;
    }

    // Physics simulation with proper gravity
    const gravity = 0.8 + Math.random() * 0.4; // Stronger, varied gravity
    const airResistance = 0.98 + Math.random() * 0.01; // Less aggressive air resistance

    // Apply gravity and air resistance
    particle.vy += gravity;
    particle.vx *= airResistance;
    particle.vy *= airResistance;

    // Add subtle random movement for natural feel
    const wobbleX = Math.sin(progress * Math.PI * 4) * 1;
    const wobbleY = Math.cos(progress * Math.PI * 3) * 0.8;

    // Update position with subtle wobble
    particle.x += particle.vx * 0.016 + wobbleX * 0.05;
    particle.y += particle.vy * 0.016 + wobbleY * 0.05;

    // Update rotation with varied speed
    particle.rotation += particle.rotationSpeed * (0.8 + Math.random() * 0.4);

    // Update scale and opacity with smoother curves
    particle.scale = 1 - progress * progress * 0.4; // Quadratic curve
    particle.opacity = 1 - progress * progress * 0.7; // Quadratic curve

    // Apply transforms
    particle.element.style.left = particle.x + "px";
    particle.element.style.top = particle.y + "px";
    particle.element.style.transform = `translate(-50%, -50%) rotate(${particle.rotation}deg) scale(${particle.scale})`;
    particle.element.style.opacity = particle.opacity.toString();

    // Add rainbow trail effect (reduced frequency for better performance)
    if (Math.random() < 0.05) {
      // 5% chance per frame
      const trail = document.createElement("div");
      trail.style.position = "fixed";
      trail.style.left = particle.x + "px";
      trail.style.top = particle.y + "px";
      trail.style.width = "3px";
      trail.style.height = "3px";
      trail.style.backgroundColor = particle.color;
      trail.style.borderRadius = "50%";
      trail.style.pointerEvents = "none";
      trail.style.zIndex = "9998";
      trail.style.transform = "translate(-50%, -50%)";
      trail.style.opacity = "0.4";
      document.body.appendChild(trail);

      // Remove trail after short time
      setTimeout(() => trail.remove(), 300);
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

/**
 * Create a focused launch point from one corner
 */
function getLaunchPoints(): Array<{ x: number; y: number }> {
  const points = [];
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // Focus from bottom-right corner
  const cornerX = screenWidth - 30;
  const cornerY = screenHeight - 30;

  // Create multiple points clustered around the corner for spread
  for (let i = 0; i < 5; i++) {
    points.push({
      x: cornerX + (Math.random() - 0.5) * 40, // Spread within 40px
      y: cornerY + (Math.random() - 0.5) * 40,
    });
  }

  return points;
}

/**
 * Enhanced confetti trigger with rainbow effect and multiple launch points
 * @param particleCount Number of confetti particles (default: 100)
 */
export function triggerConfetti(particleCount: number = 100): void {
  try {
    console.log("🎉 Triggering confetti with", particleCount, "particles");

    const launchPoints = getLaunchPoints();
    const particlesPerLaunch = Math.ceil(particleCount / launchPoints.length);

    launchPoints.forEach((launchPoint, launchIndex) => {
      for (let i = 0; i < particlesPerLaunch; i++) {
        setTimeout(
          () => {
            try {
              const particle = createConfettiParticle();
              document.body.appendChild(particle.element);
              animateConfettiParticle(particle, launchPoint);
            } catch (error) {
              console.error(
                `Error creating particle ${i + 1} from launch ${launchIndex + 1}:`,
                error,
              );
            }
          },
          launchIndex * 100 + i * 30,
        ); // Stagger launches and particles
      }
    });

    // Add some delayed particles for extended effect
    setTimeout(() => {
      for (let i = 0; i < particleCount / 4; i++) {
        setTimeout(() => {
          try {
            const particle = createConfettiParticle();
            const randomLaunch =
              launchPoints[Math.floor(Math.random() * launchPoints.length)];
            document.body.appendChild(particle.element);
            animateConfettiParticle(particle, randomLaunch);
          } catch (error) {
            console.error("Error creating delayed particle:", error);
          }
        }, i * 50);
      }
    }, 1000);
  } catch (error) {
    console.error("Error in triggerConfetti:", error);
  }
}

/**
 * Trigger a special rainbow burst effect
 */
export function triggerRainbowBurst(): void {
  const burstCount = 150;
  const launchPoints = getLaunchPoints();

  launchPoints.forEach((launchPoint, index) => {
    setTimeout(() => {
      for (let i = 0; i < burstCount / launchPoints.length; i++) {
        setTimeout(() => {
          const particle = createConfettiParticle();
          document.body.appendChild(particle.element);
          animateConfettiParticle(particle, launchPoint);
        }, i * 20);
      }
    }, index * 200);
  });
}
