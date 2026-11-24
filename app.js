const parts = {"band-0.bin": ["band-0-00.bin", "band-0-01.bin"], "band-1.bin": ["band-1-00.bin", "band-1-01.bin", "band-1-02.bin", "band-1-03.bin", "band-1-04.bin", "band-1-05.bin", "band-1-06.bin"], "band-2.bin": ["band-2-00.bin", "band-2-01.bin"], "band-3.bin": ["band-3-00.bin", "band-3-01.bin", "band-3-02.bin", "band-3-03.bin", "band-3-04.bin", "band-3-05.bin", "band-3-06.bin", "band-3-07.bin", "band-3-08.bin", "band-3-09.bin", "band-3-10.bin"], "band-4.bin": ["band-4-00.bin", "band-4-01.bin", "band-4-02.bin", "band-4-03.bin", "band-4-04.bin", "band-4-05.bin"], "band-5.bin": ["band-5-00.bin", "band-5-01.bin"]};
'use strict';
const el = id => document.getElementById(id);
let archiveKey, catalog;
const urls = new Map();
function node(tag, text) {
  const item = document.createElement(tag);
  item.textContent = text;
  return item;
}
async function decrypt(file, key) {
  const chunks = [];
  for (const part of (parts[file] || [file])) {
    const response = await fetch('./' + part);
    if (!response.ok) throw Error('Datei fehlt');
    chunks.push(await response.blob());
  }
  const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
  return crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},key,bytes.subarray(12));
}
el('entry').onsubmit = async event => {
  event.preventDefault();
  try {
    const code = el('pass').value.trim().replace(/-/g,'+').replace(/_/g,'/');
    const raw = Uint8Array.from(atob(code), ch => ch.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
    catalog = JSON.parse(new TextDecoder().decode(await decrypt('register.bin',key)));
    archiveKey = key;
    el('pass').value = '';
    catalog.families.sort((a,b)=>a.localeCompare(b,'de')).forEach(f=>el('family').add(new Option(f,f)));
    el('gate').hidden = true;
    el('archive').hidden = false;
    render();
    el('family').focus();
  } catch {
    el('message').textContent='Öffnen fehlgeschlagen. Bitte prüfe den Schlüssel und die Verbindung zum Archiv.';
  }
};
function bookCard(book) {
  const card=node('article','');
  card.className='card';
  card.append(node('strong',book.title),node('small',book.pages.length ? book.pages.length+' Seiten · PDF' : book.mime==='image/jpeg'?'JPEG · zum Vergrößern':'PDF · Druckfassung'),document.createElement('br'));
  const link=node('a','Dokument öffnen');
  link.className='action';
  link.target='_blank';
  link.rel='noopener';
  if (urls.has(book.file)) {
    link.href=urls.get(book.file);
    card.append(link);
    return card;
  }
  const button=node('button','Dokument laden');
  button.onclick=async()=>{
    button.disabled=true;
    button.textContent='Wird geladen …';
    try {
      const data=await decrypt(book.file,archiveKey);
      const url=URL.createObjectURL(new Blob([data],{type:book.mime}));
      urls.set(book.file,url);
      link.href=url;
      button.replaceWith(link);
      link.focus();
    } catch {
      button.disabled=false;
      button.textContent='Laden erneut versuchen';
    }
  };
  card.append(button);
  return card;
}
const normalize = text => text.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
function render() {
  const family=normalize(el('family').value);
  const query=normalize(el('query').value.trim());
  const cards=el('cards'),hits=el('hits');
  cards.replaceChildren();
  hits.replaceChildren();
  let count=0;
  for(const book of catalog.books) {
    let matched=false;
    if(family||query) book.pages.forEach((page,i)=>{
      const content=normalize(page);
      if(!content.includes(family)||!content.includes(query)) return;
      matched=true;
      count++;
      const row=node('details','');
      row.append(node('summary',book.title+' · Seite '+(i+1)),node('p',page));
      hits.append(row);
    });
    if(matched||!(family||query)||!book.pages.length) cards.append(bookCard(book));
  }
  el('heading').hidden=!(family||query);
  el('heading').textContent='Fundstellen ('+count+')';
  if(!count&&(family||query)) hits.append(node('p','Keine passende Textstelle gefunden. Der Gesamtstammbaum steht oben auch als Bild bereit.'));
}
el('family').onchange=render;
el('query').oninput=render;
el('lock').onclick=()=>location.reload();
