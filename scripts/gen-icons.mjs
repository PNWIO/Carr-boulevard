/** Favicon + apple touch icon from the Laughlin mark. */
import sharp from 'sharp';
import fs from 'node:fs';

const mark = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
<rect width="48" height="48" fill="${bg}"/>
<path d="M9 9h13v5.6H14.6V39H9V9Z" fill="${fg}"/>
<path d="M39 39H26v-5.6h7.4V9H39v30Z" fill="${fg}"/>
<rect x="19.6" y="19.6" width="8.8" height="8.8" fill="${fg}" opacity=".5"/>
</svg>`;

fs.writeFileSync('public/favicon.svg', mark('#1e3448', '#f7f5f1'));
await sharp(Buffer.from(mark('#1e3448', '#f7f5f1'))).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(mark('#1e3448', '#f7f5f1'))).resize(32, 32).png().toFile('public/favicon-32.png');
fs.copyFileSync('public/favicon-32.png', 'public/favicon.ico');
console.log('icons: ok');
