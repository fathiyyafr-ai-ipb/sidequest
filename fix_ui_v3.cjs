const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'pages');

const logoutSidebarRegex = /<a href="#" data-logout[\s\S]*?Keluar\s*<\/a>/g;

const dropdownReplacement = `
      <div class="relative group cursor-pointer">
        <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-primary-light transition-colors">
          <div class="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs" data-sb-init>RA</div>
          <span class="text-sm font-600 text-gray-700" data-sb-name>Rizki Aditya</span>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        
        <div class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-card border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pt-1 pb-1">
          <div class="p-1.5 flex flex-col gap-1">
            <a href="profil.html" class="flex items-center gap-2.5 px-3 py-2 text-xs font-700 text-gray-700 hover:text-primary hover:bg-primary-light rounded-lg transition-colors no-underline">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              Profil Saya
            </a>
            <a href="#" data-logout class="flex items-center gap-2.5 px-3 py-2 text-xs font-700 text-red-500 hover:bg-red-50 rounded-lg transition-colors no-underline">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              Keluar
            </a>
          </div>
        </div>
      </div>`;

// Only match <a ...> that contains bg-gray-50 and transition-colors, down to the first </a>
const desktopProfileRegex = /<a href="profil\.html"[^>]*class="[^"]*bg-gray-50[^"]*transition-colors[^"]*"[^>]*>[\s\S]*?<\/a>/g;

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
console.log(`Found ${files.length} HTML files.`);

let changedCount = 0;

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (logoutSidebarRegex.test(content)) {
    content = content.replace(logoutSidebarRegex, '');
    changed = true;
    console.log(`Removed sidebar logout from ${file}`);
  }

  if (desktopProfileRegex.test(content)) {
    content = content.replace(desktopProfileRegex, dropdownReplacement);
    changed = true;
    console.log(`Replaced desktop profile with dropdown in ${file}`);
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    changedCount++;
  }
}

console.log(`Successfully updated ${changedCount} files.`);
