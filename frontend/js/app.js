const token=localStorage.getItem('tk_token'); if(!token){location.href='/login.html';throw new Error('login required');}
const API='/api/v1';let state={projects:[],project:null,tasks:[],activity:[],analytics:null,filter:'',status:'all',priority:'all'};const socket=io();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function api(path,opt={}){const r=await fetch(API+path,{...opt,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(r.status===401){localStorage.removeItem('tk_token');location.href='/login.html';throw new Error(d.error||'Session expired');}if(!r.ok)throw new Error(d.error||'Request failed');return d;}
function shell(){document.getElementById('app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"> TeamKanban</div><nav class="nav"><button class="active"> Dashboard</button><button> My Tasks</button><button> Kanban Board</button><button> Calendar</button><button> Reports</button><button> Users</button><button> Labels</button><button> Activity</button><button> Settings</button></nav></aside><main class="main"><header class="topbar"><input class="search" id="globalSearch" placeholder="Search tasks, users, labels..."/><div class="profile"><span></span><div class="avatar" id="avatar">P</div><div><b id="userName">User</b><small style="display:block;opacity:.8">Developer</small></div><button id="logout" style="background:transparent;color:#fff"></button></div></header><section class="content" id="content"></section></main></div><div id="modalRoot"></div><div id="toastRoot"></div>`;document.getElementById('logout').onclick=()=>{localStorage.removeItem('tk_token');location.href='/login.html'};}
function toast(msg){const e=document.createElement('div');e.className='toast';e.textContent=msg;document.getElementById('toastRoot').appendChild(e);setTimeout(()=>e.remove(),2500)}
async function load(){shell();try{const me=await api('/me');document.getElementById('userName').textContent=me.user.name;document.getElementById('avatar').textContent=me.user.name[0];const p=await api('/projects');state.projects=p.data;if(!state.projects.length){document.getElementById('content').innerHTML='<div class="panel">No projects found.</div>';return}state.project=state.projects[0];await refresh();}catch(e){document.getElementById('content').innerHTML=`<div class="panel"><b>Unable to load workspace.</b><p class="muted">${esc(e.message)}</p></div>`;}}
async function refresh(){const id=state.project.id;socket.emit('project:join',id);const [t,a,x]=await Promise.all([api(`/projects/${id}/tasks`),api(`/projects/${id}/activity`),api(`/projects/${id}/analytics`)]);state.tasks=t.data;state.activity=a.data;state.analytics=x.data;render();}
function filtered(){return state.tasks.filter(t=>(!state.filter||`${t.title} ${t.description}`.toLowerCase().includes(state.filter.toLowerCase()))&&(state.status==='all'||t.status===state.status)&&(state.priority==='all'||t.priority===state.priority));}
function render(){const t=state.tasks,a=state.analytics?.totals||{};const done=Number(a.done||0),total=Number(a.total||0),pct=total?Math.round(done/total*100):0;document.getElementById('content').innerHTML=`<div class="heading"><div><h1>Project Workspace</h1><div class="muted">${esc(state.project.name)}  ${esc(state.project.key_code)}</div></div><button class="primary" id="newTask"> New Task</button></div><div class="cards"><div class="stat"><div class="label">Total Tasks</div><div class="n">${total}</div></div><div class="stat"><div class="label">Completed</div><div class="n">${done}</div></div><div class="stat"><div class="label">In Progress</div><div class="n">${a.in_progress||0}</div></div><div class="stat"><div class="label">Blocked</div><div class="n">${a.blocked||0}</div></div><div class="stat"><div class="label">Critical / High</div><div class="n">${Number(a.critical||0)+Number(a.high||0)}</div></div></div><div class="panel" style="margin-bottom:18px"><div style="display:flex;justify-content:space-between;gap:12px"><b>Project Progress</b><b>${pct}%</b></div><div class="progress" style="margin-top:9px"><span style="width:${pct}%"></span></div></div><div class="toolbar"><input id="taskSearch" placeholder="Search title or description..." value="${esc(state.filter)}"><select id="statusFilter"><option value="all">All Status</option>${['backlog','todo','in_progress','review','qa','done','blocked'].map(s=>`<option value="${s}" ${state.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}</select><select id="priorityFilter"><option value="all">All Priorities</option>${['critical','high','medium','low'].map(s=>`<option value="${s}" ${state.priority===s?'selected':''}>${s}</option>`).join('')}</select><button class="btn" id="reset">Reset</button></div><div class="board">${column('todo','To Do')} ${column('in_progress','In Progress')} ${column('review','Review')} ${column('done','Done')}</div><div class="dashgrid"><div class="panel"><h2>Recent Activity</h2><div class="activity">${state.activity.slice(0,8).map(x=>`<div class="activity-item"><span class="dot"></span><div><b>${esc(x.user_name||'System')}</b> ${esc(x.message)}<div class="muted" style="font-size:11px">${new Date(x.created_at).toLocaleString()}</div></div></div>`).join('')||'<span class="muted">No activity yet.</span>'}</div></div><div class="panel"><h2>Team Workload</h2>${(state.analytics?.members||[]).map(m=>{const p=m.total?Math.round((m.done||0)/m.total*100):0;return `<div style="margin:13px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><b>${esc(m.name)}</b><span>${m.done||0}/${m.total||0}</span></div><div class="progress" style="margin-top:5px"><span style="width:${p}%"></span></div></div>`}).join('')}</div></div>`;document.getElementById('newTask').onclick=openTask;document.getElementById('taskSearch').oninput=e=>{state.filter=e.target.value;drawBoard()};document.getElementById('statusFilter').onchange=e=>{state.status=e.target.value;drawBoard()};document.getElementById('priorityFilter').onchange=e=>{state.priority=e.target.value;drawBoard()};document.getElementById('reset').onclick=()=>{state.filter='';state.status='all';state.priority='all';render()};drawBoard();}
function column(status,title){return `<section class="column" data-status="${status}"><h3>${title} <span class="muted">${state.tasks.filter(x=>x.status===status).length}</span></h3><div id="col-${status}"></div></section>`}
function drawBoard(){for(const s of ['todo','in_progress','review','done']){const el=document.getElementById(`col-${s}`);if(!el)continue;el.innerHTML=filtered().filter(t=>t.status===s).map(taskCard).join('');el.querySelectorAll('.task').forEach(card=>{card.draggable=true;card.ondragstart=e=>e.dataTransfer.setData('text/plain',card.dataset.id);card.onclick=()=>openTask(Number(card.dataset.id));});const col=el.closest('.column');col.ondragover=e=>e.preventDefault();col.ondrop=async e=>{const id=Number(e.dataTransfer.getData('text/plain'));await moveTask(id,s)}}}
function taskCard(t){return `<article class="task" data-id="${t.id}"><div style="display:flex;justify-content:space-between;gap:6px"><h4>${esc(t.title)}</h4><span class="badge ${t.priority}">${esc(t.priority)}</span></div><p>${esc(t.description||'No description')}</p><div class="meta"><span> ${esc(t.assignee_name||'Unassigned')}</span><span>${t.due_date?esc(t.due_date):''}</span></div>${t.subtask_count?`<div class="muted" style="font-size:11px;margin-top:8px"> ${t.subtask_done}/${t.subtask_count} subtasks</div>`:''}</article>`}
async function moveTask(id,status){try{await api(`/tasks/${id}`,{method:'PATCH',body:JSON.stringify({status})});toast(`Task moved to ${status.replace('_',' ')}`);await refresh()}catch(e){toast(e.message)}}
function openTask(taskId=null){const root=document.getElementById('modalRoot');const task=taskId?state.tasks.find(t=>Number(t.id)===Number(taskId)):null;const editing=Boolean(task);const dueDate=task?.due_date?String(task.due_date).slice(0,10):'';root.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>${editing?'Edit Task':'Create Task'}</h2><form id="taskForm"><label>Title<input id="tt" required maxlength="255" value="${esc(task?.title||'')}"></label><label>Description<textarea id="td" rows="4">${esc(task?.description||'')}</textarea></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>Priority<select id="tp">${['critical','high','medium','low'].map(p=>`<option value="${p}" ${task?.priority===p?'selected':''}>${p}</option>`).join('')}</select></label><label>Type<select id="ty">${['task','feature','bug','improvement','support'].map(type=>`<option value="${type}" ${task?.type===type?'selected':''}>${type}</option>`).join('')}</select></label></div><label>Status<select id="ts">${['todo','in_progress','review','done','blocked'].map(status=>`<option value="${status}" ${task?.status===status?'selected':''}>${status.replace('_',' ')}</option>`).join('')}</select></label><label>Due date<input id="due" type="date" value="${dueDate}"></label><div class="modal-actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="primary">${editing?'Save Changes':'Create Task'}</button></div></form></div></div>`;document.getElementById('cancel').onclick=()=>root.innerHTML='';document.getElementById('taskForm').onsubmit=async e=>{e.preventDefault();try{const payload={title:document.getElementById('tt').value.trim(),description:document.getElementById('td').value.trim(),priority:document.getElementById('tp').value,type:document.getElementById('ty').value,status:document.getElementById('ts').value,due_date:document.getElementById('due').value||null};if(!payload.title)throw new Error('Task title is required');if(editing){await api(`/tasks/${task.id}`,{method:'PATCH',body:JSON.stringify(payload)});root.innerHTML='';toast('Task updated successfully')}else{await api(`/projects/${state.project.id}/tasks`,{method:'POST',body:JSON.stringify(payload)});root.innerHTML='';toast('Task created')}await refresh()}catch(err){toast(err.message)}}}function initSocket(){socket.on('task:updated',async()=>{try{await refresh()}catch{}})}
initSocket();load();

/* ===== TeamKanban Sidebar Views ===== */
(function(){
  const viewNames = [
    "Dashboard","My Tasks","Kanban Board","Calendar",
    "Reports","Users","Labels","Activity","Settings"
  ];

  function closeView(){
    const old=document.getElementById("tkViewOverlay");
    if(old) old.remove();
  }

  function escView(v){
    return String(v ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function openView(title, html){
    closeView();

    const overlay=document.createElement("div");
    overlay.id="tkViewOverlay";
    overlay.innerHTML=`
      <div style="
        position:fixed;inset:0;background:rgba(15,23,42,.55);
        z-index:9999;display:flex;align-items:center;justify-content:center;
        padding:24px;">
        <div style="
          width:min(900px,95vw);max-height:88vh;overflow:auto;
          background:#fff;border-radius:18px;padding:28px;
          box-shadow:0 25px 80px rgba(0,0,0,.25);">
          <div style="
            display:flex;justify-content:space-between;align-items:center;
            margin-bottom:22px;">
            <h2 style="margin:0;color:#172033;">${escView(title)}</h2>
            <button id="tkCloseView" style="
              border:0;background:#eef2ff;border-radius:10px;
              padding:9px 14px;cursor:pointer;font-weight:700;">Close</button>
          </div>
          ${html}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById("tkCloseView").onclick=closeView;
    overlay.firstElementChild.addEventListener("click",e=>{
      if(e.target===overlay.firstElementChild) closeView();
    });
  }

  async function projectId(){
    if(window.state?.project?.id) return state.project.id;
    try{
      const r=await api("/projects");
      const data=r.data || r;
      return Array.isArray(data) ? data[0]?.id : null;
    }catch(e){ return null; }
  }

  async function showMyTasks(){
    const pid=await projectId();
    if(!pid) return openView("My Tasks","<p>Project data is unavailable.</p>");

    try{
      const [me,tasksResponse]=await Promise.all([
        api("/me"),
        api(`/projects/${pid}/tasks`)
      ]);

      const user=me.data || me;
      const tasks=tasksResponse.data || tasksResponse;

      const mine=(Array.isArray(tasks)?tasks:[]).filter(t =>
        Number(t.assignee_id)===Number(user?.id) ||
        String(t.assignee_name||"").toLowerCase()===String(user?.name||"").toLowerCase()
      );

      openView("My Tasks",`
        <p style="color:#64748b;">Tasks assigned to ${escView(user?.name || "you")}</p>
        <div style="display:grid;gap:12px;">
          ${mine.length ? mine.map(t=>`
            <div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;">
              <strong>${escView(t.title)}</strong>
              <div style="margin-top:6px;color:#64748b;">
                Status: ${escView(t.status)} &nbsp; | &nbsp;
                Priority: ${escView(t.priority)}
              </div>
            </div>`).join("") :
            "<p>No tasks are currently assigned to you.</p>"}
        </div>`);
    }catch(e){
      openView("My Tasks",`<p>Unable to load tasks: ${escView(e.message)}</p>`);
    }
  }

  async function showCalendar(){
    const pid=await projectId();
    if(!pid) return openView("Calendar","<p>Project data is unavailable.</p>");

    try{
      const r=await api(`/projects/${pid}/tasks`);
      const tasks=r.data || r;
      const list=(Array.isArray(tasks)?tasks:[])
        .filter(t=>t.due_date)
        .sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));

      openView("Calendar",`
        <p style="color:#64748b;">Upcoming task deadlines</p>
        <div style="display:grid;gap:10px;">
        ${list.length ? list.map(t=>`
          <div style="display:flex;justify-content:space-between;
            padding:14px;border:1px solid #e2e8f0;border-radius:10px;">
            <strong>${escView(t.title)}</strong>
            <span>${escView(String(t.due_date).slice(0,10))}</span>
          </div>`).join("") :
          "<p>No tasks currently have due dates.</p>"}
        </div>`);
    }catch(e){
      openView("Calendar",`<p>Unable to load calendar: ${escView(e.message)}</p>`);
    }
  }

  async function showReports(){
    const pid=await projectId();
    if(!pid) return openView("Reports","<p>Project data is unavailable.</p>");

    try{
      const r=await api(`/projects/${pid}/analytics`);
      const a=r.data || r;

      const entries=Object.entries(a || {}).filter(([k])=>k!=="success");

      openView("Reports",`
        <p style="color:#64748b;">Live project analytics from the backend.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
          ${entries.map(([k,v])=>`
            <div style="padding:18px;border:1px solid #e2e8f0;border-radius:12px;">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;">
                ${escView(k.replace(/_/g," "))}
              </div>
              <div style="font-size:26px;font-weight:800;margin-top:6px;">
                ${escView(typeof v==="object"?JSON.stringify(v):v)}
              </div>
            </div>`).join("")}
        </div>`);
    }catch(e){
      openView("Reports",`<p>Unable to load reports: ${escView(e.message)}</p>`);
    }
  }

  async function showActivity(){
    const pid=await projectId();
    if(!pid) return openView("Activity","<p>Project data is unavailable.</p>");

    try{
      const r=await api(`/projects/${pid}/activity`);
      const items=r.data || r;

      openView("Activity",`
        <p style="color:#64748b;">Recent project activity</p>
        <div style="display:grid;gap:10px;">
          ${(Array.isArray(items)?items:[]).map(x=>`
            <div style="padding:14px;border-left:4px solid #6366f1;
              background:#f8fafc;border-radius:8px;">
              <strong>${escView(x.action || x.event_type || "Activity")}</strong>
              <div style="color:#64748b;margin-top:4px;">
                ${escView(x.description || x.message || x.created_at || "")}
              </div>
            </div>`).join("") || "<p>No activity found.</p>"}
        </div>`);
    }catch(e){
      openView("Activity",`<p>Unable to load activity: ${escView(e.message)}</p>`);
    }
  }

  async function showNotifications(){
    const pid=await projectId();
    if(!pid) return openView("Notifications","<p>Project data is unavailable.</p>");

    try{
      const r=await api(`/projects/${pid}/notifications`);
      const items=r.data || r;

      openView("Notifications",`
        <div style="display:grid;gap:10px;">
          ${(Array.isArray(items)?items:[]).map(x=>`
            <div style="padding:14px;border:1px solid #e2e8f0;border-radius:10px;">
              <strong>${escView(x.title || x.type || "Notification")}</strong>
              <div style="color:#64748b;margin-top:5px;">
                ${escView(x.message || x.body || x.created_at || "")}
              </div>
            </div>`).join("") || "<p>No notifications available.</p>"}
        </div>`);
    }catch(e){
      openView("Notifications",`<p>Unable to load notifications: ${escView(e.message)}</p>`);
    }
  }

  async function showUsers(){
    const pid=await projectId();
    if(!pid) return openView("Users","<p>Project data is unavailable.</p>");

    try{
      const r=await api(`/projects/${pid}/tasks`);
      const tasks=r.data || r;
      const names=[...new Set(
        (Array.isArray(tasks)?tasks:[])
          .map(t=>t.assignee_name)
          .filter(Boolean)
      )];

      openView("Users",`
        <p style="color:#64748b;">Team members represented in the current project workload.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
          ${names.map(n=>`
            <div style="padding:18px;border:1px solid #e2e8f0;border-radius:12px;">
              <strong>${escView(n)}</strong>
              <div style="color:#64748b;margin-top:4px;">Project member</div>
            </div>`).join("") || "<p>No assigned team members found.</p>"}
        </div>`);
    }catch(e){
      openView("Users",`<p>Unable to load users: ${escView(e.message)}</p>`);
    }
  }

  async function showLabels(){
    const pid=await projectId();
    if(!pid) return openView("Labels","<p>Project data is unavailable.</p>");

    try{
      const r=await api(`/projects/${pid}/tasks`);
      const tasks=r.data || r;
      const labels=new Set();

      (Array.isArray(tasks)?tasks:[]).forEach(t=>{
        if(Array.isArray(t.labels)){
          t.labels.forEach(x=>labels.add(typeof x==="object"?(x.name||x.label):x));
        }
        if(t.label) labels.add(t.label);
      });

      openView("Labels",`
        <p style="color:#64748b;">Labels currently associated with project tasks.</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${[...labels].filter(Boolean).map(x=>`
            <span style="padding:8px 14px;background:#eef2ff;
              color:#4338ca;border-radius:999px;font-weight:700;">
              ${escView(x)}
            </span>`).join("") || "<p>No labels are currently assigned to the loaded tasks.</p>"}
        </div>`);
    }catch(e){
      openView("Labels",`<p>Unable to load labels: ${escView(e.message)}</p>`);
    }
  }

  async function showSettings(){
    try{
      const r=await api("/me");
      const u=r.data || r;

      openView("Settings",`
        <div style="display:grid;gap:14px;">
          <div><strong>Name</strong><br>${escView(u.name)}</div>
          <div><strong>Email</strong><br>${escView(u.email)}</div>
          <div><strong>Role</strong><br>${escView(u.role)}</div>
          <div style="padding:14px;background:#f8fafc;border-radius:10px;">
            Authentication: JWT<br>
            Database: MySQL<br>
            Real-time: Socket.IO
          </div>
        </div>`);
    }catch(e){
      openView("Settings",`<p>Unable to load settings: ${escView(e.message)}</p>`);
    }
  }

  document.addEventListener("click",function(e){
    const el=e.target.closest("a,button");
    if(!el) return;

    const label=el.textContent.trim().replace(/\s+/g," ");
    if(!viewNames.includes(label)) return;

    e.preventDefault();
    e.stopPropagation();

    if(label==="Dashboard"){
      closeView();
      window.scrollTo({top:0,behavior:"smooth"});
    }
    else if(label==="Kanban Board"){
      closeView();
      window.scrollTo({top:500,behavior:"smooth"});
    }
    else if(label==="My Tasks") showMyTasks();
    else if(label==="Calendar") showCalendar();
    else if(label==="Reports") showReports();
    else if(label==="Users") showUsers();
    else if(label==="Labels") showLabels();
    else if(label==="Activity") showActivity();
    else if(label==="Settings") showSettings();
  },true);

  window.TeamKanbanViews={
    showMyTasks,showCalendar,showReports,
    showUsers,showLabels,showActivity,
    showSettings,showNotifications
  };
})();
