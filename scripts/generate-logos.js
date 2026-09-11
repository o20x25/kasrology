import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Kasr Al-Ainy Dome & Typography Vector Recreation
 * Based on the user's uploaded branding images.
 */

// Icon in 120 x 120 viewbox
function getDomeIcon(isDark = true, size = 100) {
  const leftTeal = isDark ? '#4DAAA0' : '#44A197';
  const rightTeal = isDark ? '#3B8980' : '#337F76';
  const spireTeal = isDark ? '#4DAAA0' : '#44A197';

  return `
    <g id="kasr-dome" transform="scale(${size / 100})">
      <!-- Finial / Spire atop dome -->
      <!-- Spire needle tip -->
      <polygon points="50,4 48.5,12 51.5,12" fill="${spireTeal}" />
      <!-- Small ring / sphere -->
      <circle cx="50" cy="15" r="2.4" fill="${spireTeal}" />
      <!-- Spire neck -->
      <rect x="49" y="17.4" width="2" height="6.6" fill="${spireTeal}" />
      <!-- Spire collar -->
      <rect x="47.5" y="24" width="5" height="2" rx="0.5" fill="${spireTeal}" />
      <!-- Base attachment to dome -->
      <rect x="48.5" y="26" width="3" height="3" fill="${spireTeal}" />

      <!-- Left Dome Shell (Teal) -->
      <!-- Outer dome curve from base (12,95) to apex (50,28), then cut out along diagonal ribbon and vertical notch -->
      <path d="
        M 50 28
        C 32 28, 12 48, 12 76
        L 12 95
        L 24 95
        L 24 74
        L 66 37
        C 61 32, 56 29, 50 28
        Z
      " fill="${leftTeal}" />

      <!-- Left vertical pillar at base (entrance archway) -->
      <path d="
        M 12 70
        L 12 95
        L 24 95
        L 24 70
        Z
      " fill="${leftTeal}" />

      <!-- Right Dome Shadow Segment (Darker Teal) -->
      <!-- Bounded by diagonal cut on left and outer dome curve on right -->
      <path d="
        M 38 95
        L 74 58
        C 81 65, 87 75, 88 84
        L 88 95
        Z
      " fill="${rightTeal}" />

      <!-- Smooth fill for right flank to ensure seamless curve -->
      <path d="
        M 38 95
        L 73 59
        C 79 66, 84 76, 86 86
        L 86 95
        Z
      " fill="${rightTeal}" />
    </g>
  `;
}

// Full horizontal logo banner (for navbar and login header)
function generateHorizontalSvg(isDark = true) {
  const bg = isDark ? '#192425' : '#E2E8E7';
  const textColor = isDark ? '#FFFFFF' : '#192425';
  const textOlogyColor = isDark ? '#F3F4F6' : '#192425';

  return `
  <svg width="460" height="110" viewBox="0 0 460 110" xmlns="http://www.w3.org/2000/svg">
    <!-- Clean background container -->
    <rect width="100%" height="100%" fill="${bg}" rx="14" />
    
    <!-- Left: Kasr Al-Ainy Dome Icon -->
    <g transform="translate(18, 4)">
      ${getDomeIcon(isDark, 102)}
    </g>

    <!-- Right: KASRology Typography -->
    <g transform="translate(142, 69)">
      <text font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="46" letter-spacing="-0.5">
        <tspan fill="${textColor}" font-weight="800">KASR</tspan><tspan fill="${textOlogyColor}" font-weight="400">ology</tspan>
      </text>
    </g>
  </svg>
  `;
}

// Favicon SVG (icon alone on rounded tile)
function generateFaviconSvg(isDark = true) {
  const bg = isDark ? '#192425' : '#E2E8E7';
  return `
  <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}" rx="56" />
    <g transform="translate(38, 28)">
      ${getDomeIcon(isDark, 180)}
    </g>
  </svg>
  `;
}

// 1024x1024 Square version (matching exactly the user's uploaded images)
function generateSquareLogoSvg(isDark = true) {
  const bg = isDark ? '#192425' : '#E2E8E7';
  const textColor = isDark ? '#FFFFFF' : '#192425';
  const textOlogyColor = isDark ? '#F3F4F6' : '#192425';

  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}" />
    
    <!-- Centered Logo Group: Icon + Text -->
    <g transform="translate(190, 445)">
      <!-- Dome Icon -->
      <g transform="translate(0, -60)">
        ${getDomeIcon(isDark, 150)}
      </g>
      <!-- Typography -->
      <text x="180" y="45" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="76" letter-spacing="-0.8">
        <tspan fill="${textColor}" font-weight="800">KASR</tspan><tspan fill="${textOlogyColor}" font-weight="400">ology</tspan>
      </text>
    </g>
  </svg>
  `;
}

async function buildAll() {
  console.log('Building high-resolution logos and favicons...');

  // 1. Horizontal Logo (for Navbar & UI, aspect ~ 4.2:1)
  const darkHorizSvg = Buffer.from(generateHorizontalSvg(true));
  const lightHorizSvg = Buffer.from(generateHorizontalSvg(false));

  const darkHorizPng = await sharp(darkHorizSvg).resize(920, 220).png().toBuffer();
  const lightHorizPng = await sharp(lightHorizSvg).resize(920, 220).png().toBuffer();

  // Save horizontal logos
  fs.writeFileSync('public/assets/logo-dark.png', darkHorizPng);
  fs.writeFileSync('public/assets/logo-light.png', lightHorizPng);
  fs.writeFileSync('src/assets/logo-dark.png', darkHorizPng);
  fs.writeFileSync('src/assets/logo-light.png', lightHorizPng);
  fs.writeFileSync('public/logo-dark.png', darkHorizPng);
  fs.writeFileSync('public/logo-light.png', lightHorizPng);

  // 2. Square 1024x1024 versions (exact match of uploaded files)
  const darkSquareSvg = Buffer.from(generateSquareLogoSvg(true));
  const lightSquareSvg = Buffer.from(generateSquareLogoSvg(false));

  const darkSquarePng = await sharp(darkSquareSvg).resize(1024, 1024).png().toBuffer();
  const lightSquarePng = await sharp(lightSquareSvg).resize(1024, 1024).png().toBuffer();

  fs.writeFileSync('public/assets/logo-dark-square.png', darkSquarePng);
  fs.writeFileSync('public/assets/logo-light-square.png', lightSquarePng);
  fs.writeFileSync('src/assets/logo-dark-square.png', darkSquarePng);
  fs.writeFileSync('src/assets/logo-light-square.png', lightSquarePng);

  // 3. Favicon (dome icon alone, square)
  const faviconSvg = Buffer.from(generateFaviconSvg(true));
  const favicon256 = await sharp(faviconSvg).resize(256, 256).png().toBuffer();
  const favicon128 = await sharp(faviconSvg).resize(128, 128).png().toBuffer();
  const favicon48 = await sharp(faviconSvg).resize(48, 48).png().toBuffer();
  const favicon32 = await sharp(faviconSvg).resize(32, 32).png().toBuffer();
  const favicon16 = await sharp(faviconSvg).resize(16, 16).png().toBuffer();

  fs.writeFileSync('public/favicon.png', favicon128);
  fs.writeFileSync('public/favicon-32x32.png', favicon32);
  fs.writeFileSync('public/favicon-16x16.png', favicon16);
  fs.writeFileSync('public/favicon.ico', favicon32);
  fs.writeFileSync('public/apple-touch-icon.png', favicon256);
  fs.writeFileSync('public/assets/favicon.png', favicon128);

  console.log('Successfully rendered all logo and favicon assets!');
}

buildAll().catch(console.error);
