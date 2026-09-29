/** Favicon + apple touch icon from the Laughlin mark. */
import sharp from 'sharp';
import fs from 'node:fs';

const mark = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
<rect width="48" height="48" rx="2" fill="${bg}"/>
<path d="M6 6h8v28h20V15h-6v15h-8V6h17l5 5v26l-5 5H6V6Z" fill="${fg}"/>
</svg>`;

fs.writeFileSync('public/favicon.svg', mark('#303030', '#ffffff'));
await sharp(Buffer.from(mark('#303030', '#ffffff'))).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(mark('#303030', '#ffffff'))).resize(32, 32).png().toFile('public/favicon-32.png');
fs.copyFileSync('public/favicon-32.png', 'public/favicon.ico');
console.log('icons: ok');
