console.log("FriendDrive starting...");
console.log("Supabase:", supabaseClient);


const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="frienddrive-local-v1";
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{files:[],view:"drive",folder:null,theme:"light"};
let history=[],future=[];
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();
const fmt=n=>{if(!n)return"0 B";let u=["B","KB","MB","GB","TB"],i=Math.floor(Math.log(n)/Math.log(1024));return (n/1024**i).toFixed(i?1:0)+" "+u[i]};
const icon=f=>f.type==="folder"?"📁":f.mime?.startsWith("image/")?"🖼️":f.mime?.startsWith("video/")?"🎬":f.mime?.startsWith("audio/")?"🎵":f.name.endsWith(".zip")||f.name.endsWith(".7z")?"📦":f.name.endsWith(".pdf")?"📕":f.name.endsWith(".js")||f.name.endsWith(".html")||f.name.endsWith(".css")?"💻":"📄";
function commit(){save();render();history.push(JSON.stringify(state));future=[]}
function children(){let folder=state.folder;return state.files.filter(f=>f.parent===folder && (state.view==="drive"||state.view==="shared"&&f.shared||state.view==="recent"||state.view==="starred"&&f.starred||state.view==="trash"&&f.trash))}
function render(){
 document.body.classList.toggle("dark",state.theme==="dark");
 $$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));
 const names={drive:"My Drive",shared:"Shared with me",recent:"Recent",starred:"Starred",trash:"Trash"};$("#title").textContent=names[state.view]||"My Drive";
 $("#subtitle").textContent=state.view==="drive"?"Your files and folders":state.view==="shared"?"Files shared with you":state.view==="trash"?"Deleted files":"Files and folders";
 let list=children();let q=$("#search").value.trim().toLowerCase();if(q)list=state.files.filter(f=>f.name.toLowerCase().includes(q)&&!f.trash);
 if(state.view==="recent")list.sort((a,b)=>b.updated-a.updated);
 $("#files").innerHTML=list.map(f=>`<article class="file ${f.type}" data-id="${f.id}" draggable="true">
   <button class="star ${f.starred?"on":""}" title="Star">${f.starred?"★":"☆"}</button>
   <button class="menu" title="More">⋮</button><div class="file-icon">${icon(f)}</div>
   <div class="file-name">${esc(f.name)}</div><div class="file-meta">${f.type==="folder"?"Folder":fmt(f.size)} · ${new Date(f.updated).toLocaleDateString()}</div>
 </article>`).join("");
 $("#empty").classList.toggle("hidden",list.length!==0);$("#files").classList.toggle("hidden",list.length===0);
 let used=state.files.filter(f=>!f.trash&&f.type!=="folder").reduce((a,f)=>a+(f.size||0),0), quota=5*1024**3;
 $("#storageText").textContent=`${fmt(used)} of 5 GB used`;$("#storageBar").style.width=Math.min(100,used/quota*100)+"%";
 $("#crumbs").textContent=state.folder?"My Drive / Folder":"";
 save();
}
function esc(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function modal(html){$("#modalBody").innerHTML=html;$("#modal").classList.remove("hidden")}
function close(){ $("#modal").classList.add("hidden") }
function toast(s){let t=$("#toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function newFolder(){modal(`<h2>New folder</h2><input id="folderName" autofocus placeholder="Folder name"><div class="modal-actions"><button class="secondary" id="cancel">Cancel</button><button class="primary" id="make">Create</button></div>`);$("#make").onclick=()=>{let n=$("#folderName").value.trim();if(!n)return;state.files.push({id:id(),name:n,type:"folder",parent:state.folder,size:0,updated:Date.now()});close();commit();toast("Folder created")};$("#cancel").onclick=close}
function upload(files){[...files].forEach(file=>{state.files.push({id:id(),name:file.name,type:"file",mime:file.type,size:file.size,parent:state.folder,updated:Date.now(),starred:false,shared:false,trash:false});});commit();toast(`${files.length} file${files.length>1?"s":""} added`)}
$("#newBtn").onclick=()=>modal(`<h2>Create</h2><button class="secondary" id="nf" style="width:100%;margin-bottom:8px">📁 New folder</button><button class="secondary" id="up" style="width:100%">↑ Upload files</button>`); 
$("#uploadBtn").onclick=()=>$("#fileInput").click();$("#fileInput").onchange=e=>upload(e.target.files);
$("#dropzone").ondragover=e=>{e.preventDefault();$("#dropzone").classList.add("drag")};$("#dropzone").ondragleave=()=>$("#dropzone").classList.remove("drag");$("#dropzone").ondrop=e=>{e.preventDefault();$("#dropzone").classList.remove("drag");upload(e.dataTransfer.files)};
$("#files").onclick=e=>{let card=e.target.closest(".file");if(!card)return;let f=state.files.find(x=>x.id===card.dataset.id);
 if(e.target.classList.contains("star")){f.starred=!f.starred;commit();return}
 if(e.target.classList.contains("menu")){context(e,f);return}
 if(f.type==="folder"){state.folder=f.id;state.view="drive";render()}else preview(f)
};
function context(e,f){document.querySelector(".context")?.remove();let c=document.createElement("div");c.className="context";c.style.left=e.clientX+"px";c.style.top=e.clientY+"px";c.innerHTML=`<button data-a="rename">✎ Rename</button><button data-a="star">${f.starred?"☆ Unstar":"★ Star"}</button><button data-a="share">♧ Share</button><button data-a="delete">${f.trash?"↩ Restore":"🗑 Move to trash"}</button>`;document.body.append(c);c.onclick=x=>{let a=x.target.dataset.a;if(!a)return;if(a==="rename"){let n=prompt("New name:",f.name);if(n?.trim()){f.name=n.trim();f.updated=Date.now();commit()}}if(a==="star"){f.starred=!f.starred;commit()}if(a==="share"){modal(`<h2>Share “${esc(f.name)}”</h2><p>FriendDrive sharing is ready for the backend connection. In this starter build, this creates a share record locally.</p><input placeholder="Friend's email"><div class="modal-actions"><button class="primary" onclick="close()">Done</button></div>`)}if(a==="delete"){f.trash=!f.trash;commit();toast(f.trash?"Moved to trash":"Restored")}c.remove()};}
function preview(f){if(f.mime?.startsWith("image/")){let u=URL.createObjectURL(new Blob());modal(`<h2>${esc(f.name)}</h2><p>Preview becomes available when storage is connected.</p>`)}else modal(`<h2>${esc(f.name)}</h2><p>${fmt(f.size)} · ${f.mime||"File"}</p><p>This GitHub Pages starter stores metadata locally. Connect the backend to enable real cloud upload/download.</p>`)}
$$(".nav").forEach(n=>n.onclick=()=>{state.view=n.dataset.view;state.folder=null;render()});
$("#search").oninput=render;$("#themeBtn").onclick=()=>{state.theme=state.theme==="dark"?"light":"dark";commit()};$("#helpBtn").onclick=()=>modal(`<h2>FriendDrive</h2><p>A Google Drive-style friends-only cloud drive. This frontend is designed for GitHub Pages; the production backend/storage should be connected separately.</p><p><b>New</b> creates folders or uploads. Drag files into the upload area. Use ⋮ for sharing, starring, renaming and trash.</p>`);
$("#closeModal").onclick=close;$("#modal").onclick=e=>{if(e.target.id==="modal")close()};document.addEventListener("click",e=>{if(!e.target.closest(".context"))document.querySelector(".context")?.remove()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
$("#newBtn").addEventListener("click",()=>{setTimeout(()=>{$("#nf")?.addEventListener("click",()=>{close();newFolder()});$("#up")?.addEventListener("click",()=>{close();$("#fileInput").click()})},0)});
render();
