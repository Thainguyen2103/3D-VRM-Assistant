const fs = require('fs');
const citlali = fs.readFileSync('src/styles/themes/citlali.css', 'utf-8');

const palettes = {
  pyro: ['#b71c1c', '#d32f2f', '#e53935', '#ef5350', '#e57373', '#ffcdd2', '#ffebee'],
  hydro: ['#0d47a1', '#1976d2', '#1e88e5', '#42a5f5', '#64b5f6', '#bbdefb', '#e3f2fd'],
  anemo: ['#004d40', '#00796b', '#00897b', '#26a69a', '#4db6ac', '#b2dfdb', '#e0f2f1'],
  electro: ['#4a148c', '#7b1fa2', '#8e24aa', '#ab47bc', '#ba68c8', '#e1bee7', '#f3e5f5'],
  dendro: ['#33691e', '#558b2f', '#689f38', '#7cb342', '#8bc34a', '#dcedc8', '#f1f8e9'],
  cryo: ['#006064', '#00838f', '#0097a7', '#26c6da', '#4dd0e1', '#b2ebf2', '#e0f7fa'],
  geo: ['#f57f17', '#f9a825', '#fbc02d', '#fdd835', '#ffeb3b', '#fff9c4', '#fffde7']
};

const citlaliPalette = ['#1a237e', '#3949ab', '#5c6bc0', '#7986cb', '#9fa8da', '#c5cae9', '#e8eaf6'];

let elementsCss = '';

for (const [themeName, palette] of Object.entries(palettes)) {
  let themeCss = citlali;
  
  // Remove global background
  themeCss = themeCss.replace(/body\.theme-citlali \{\s*background: linear-gradient[^\}]+\}\s*/g, '');

  themeCss = themeCss.replaceAll('citlali', themeName);
  
  citlaliPalette.forEach((cColor, i) => {
    themeCss = themeCss.replaceAll(cColor, palette[i]);
  });
  
  const citlaliBase = '#3f51b5';
  const citlaliBaseRgb = '63, 81, 181';
  
  const targetBase = palette[2]; // use 500 level
  const r = parseInt(targetBase.slice(1,3), 16);
  const g = parseInt(targetBase.slice(3,5), 16);
  const b = parseInt(targetBase.slice(5,7), 16);
  const targetBaseRgb = `${r}, ${g}, ${b}`;
  
  themeCss = themeCss.replaceAll(citlaliBase, targetBase);
  themeCss = themeCss.replaceAll(citlaliBaseRgb, targetBaseRgb);
  
  elementsCss += `/* === THEME ${themeName.toUpperCase()} === */\n\n` + themeCss + '\n\n';
}

fs.writeFileSync('src/styles/themes/elements.css', elementsCss);
console.log('elements.css generated!');
