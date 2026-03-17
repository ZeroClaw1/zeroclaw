// ZeroClaw square brand mark — works at 16px to 512px
// Concept: Stylized "Z" made of three claw slash marks inside a rounded square
// The slashes create the Z shape while evoking claw scratches

export const BRAND_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="hsl(173, 80%, 30%)"/>
      <stop offset="100%" stop-color="hsl(265, 60%, 35%)"/>
    </linearGradient>
    <linearGradient id="claw-grad" x1="100" y1="100" x2="412" y2="412" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="hsl(173, 80%, 65%)"/>
      <stop offset="50%" stop-color="hsl(200, 70%, 60%)"/>
      <stop offset="100%" stop-color="hsl(265, 60%, 65%)"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <!-- Rounded square background -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="url(#bg-grad)"/>
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="hsl(173, 80%, 50%)" stroke-width="2" opacity="0.3"/>
  
  <!-- Three claw slashes forming a "Z" shape -->
  <g filter="url(#glow)">
    <!-- Top horizontal slash -->
    <path d="M 130 150 Q 180 135, 256 140 Q 330 145, 382 150" 
          stroke="url(#claw-grad)" stroke-width="36" stroke-linecap="round" fill="none"/>
    
    <!-- Diagonal slash (connects top-right to bottom-left) -->
    <path d="M 365 165 Q 310 240, 256 280 Q 200 320, 147 350" 
          stroke="url(#claw-grad)" stroke-width="36" stroke-linecap="round" fill="none"/>
    
    <!-- Bottom horizontal slash -->
    <path d="M 130 362 Q 180 367, 256 362 Q 330 357, 382 362" 
          stroke="url(#claw-grad)" stroke-width="36" stroke-linecap="round" fill="none"/>
  </g>
  
  <!-- Small claw scratch details at the ends -->
  <circle cx="125" cy="150" r="6" fill="hsl(173, 80%, 65%)" opacity="0.6"/>
  <circle cx="387" cy="150" r="6" fill="hsl(265, 60%, 65%)" opacity="0.6"/>
  <circle cx="125" cy="362" r="6" fill="hsl(173, 80%, 65%)" opacity="0.6"/>
  <circle cx="387" cy="362" r="6" fill="hsl(265, 60%, 65%)" opacity="0.6"/>
</svg>`;

// Favicon version — simplified, bolder strokes for small sizes
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="1" y="1" width="30" height="30" rx="6" fill="hsl(173, 80%, 28%)"/>
  <path d="M 8 10 L 24 10" stroke="hsl(173, 80%, 65%)" stroke-width="3" stroke-linecap="round"/>
  <path d="M 22 10 L 10 22" stroke="hsl(200, 70%, 60%)" stroke-width="3" stroke-linecap="round"/>
  <path d="M 8 22 L 24 22" stroke="hsl(265, 60%, 65%)" stroke-width="3" stroke-linecap="round"/>
</svg>`;
